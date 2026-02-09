// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AggregatorV3Interface} from "chainlink-brownie-contracts/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {StableCoin} from "./StableCoin.sol";
import {OracleLib} from "./libraries/OracleLib.sol";

/**
 * @title StableCoinEngine
 * @author SCP Team
 * @notice Core logic for collateralized debt positions and liquidation flow.
 * @dev Uses Chainlink feeds via OracleLib stale checks for all price reads.
 */
contract StableCoinEngine is ReentrancyGuard {
    using OracleLib for AggregatorV3Interface;

    error StableCoinEngine__ArrayLengthMismatch();
    error StableCoinEngine__ZeroAddress();
    error StableCoinEngine__AmountMustBeMoreThanZero();
    error StableCoinEngine__TokenNotAllowed(address tokenCollateralAddress);
    error StableCoinEngine__TransferFailed();
    error StableCoinEngine__BreaksHealthFactor(uint256 healthFactor);
    error StableCoinEngine__MintFailed();
    error StableCoinEngine__HealthFactorOk();
    error StableCoinEngine__HealthFactorNotImproved();
    error StableCoinEngine__InsufficientCollateral();
    error StableCoinEngine__BurnAmountExceedsMinted(uint256 burnAmount, uint256 mintedAmount);
    error StableCoinEngine__InvalidPrice();

    event CollateralDeposited(address indexed user, address indexed tokenCollateralAddress, uint256 amountCollateral);
    event CollateralRedeemed(
        address indexed redeemedFrom,
        address indexed redeemedTo,
        address indexed tokenCollateralAddress,
        uint256 amountCollateral
    );
    event StableCoinMinted(address indexed user, uint256 amount);
    event StableCoinBurned(address indexed user, uint256 amount);
    event StabilityFeeAccrued(uint256 annualizedFeeBps, uint256 updatedRate, uint256 timeElapsed);

    uint256 private constant ADDITIONAL_FEED_PRECISION = 1e10;
    uint256 private constant PRECISION = 1e18;
    uint256 private constant RAY = 1e27;
    uint256 private constant BPS_DENOMINATOR = 10_000;
    uint256 private constant SECONDS_PER_YEAR = 365 days;
    uint256 private constant PEG_PRICE = 1e18;

    uint256 private constant BASE_STABILITY_FEE_BPS = 200; // 2.00%
    uint256 private constant MIN_STABILITY_FEE_BPS = 0;
    uint256 private constant MAX_STABILITY_FEE_BPS = 2_500; // 25.00%
    uint256 private constant PEG_DEVIATION_DEADBAND_BPS = 10; // 0.10%
    uint256 private constant BELOW_PEG_FEE_SENSITIVITY = 3;
    uint256 private constant ABOVE_PEG_FEE_SENSITIVITY = 2;

    uint256 private constant LIQUIDATION_THRESHOLD = 50;
    uint256 private constant LIQUIDATION_PRECISION = 100;
    uint256 private constant MIN_HEALTH_FACTOR = 1e18;
    uint256 private constant LIQUIDATION_BONUS = 10;

    mapping(address => address) private s_priceFeeds;
    mapping(address => mapping(address => uint256)) private s_collateralDeposited;
    mapping(address => uint256) private s_normalizedDebt;

    uint256 private s_rate;
    uint256 private s_lastStabilityFeeTimestamp;
    uint256 private s_currentStabilityFeeBps;

    address[] private s_collateralTokens;
    StableCoin private immutable i_stableCoin;
    AggregatorV3Interface private immutable i_stableCoinPriceFeed;

    modifier moreThanZero(uint256 amount) {
        if (amount == 0) {
            revert StableCoinEngine__AmountMustBeMoreThanZero();
        }
        _;
    }

    modifier isAllowedToken(address tokenCollateralAddress) {
        if (s_priceFeeds[tokenCollateralAddress] == address(0)) {
            revert StableCoinEngine__TokenNotAllowed(tokenCollateralAddress);
        }
        _;
    }

    constructor(
        address[] memory tokenCollateralAddresses,
        address[] memory priceFeedAddresses,
        address stableCoinAddress,
        address stableCoinPriceFeedAddress
    ) {
        if (tokenCollateralAddresses.length != priceFeedAddresses.length) {
            revert StableCoinEngine__ArrayLengthMismatch();
        }
        if (stableCoinAddress == address(0) || stableCoinPriceFeedAddress == address(0)) {
            revert StableCoinEngine__ZeroAddress();
        }

        for (uint256 i = 0; i < tokenCollateralAddresses.length; i++) {
            address token = tokenCollateralAddresses[i];
            address priceFeed = priceFeedAddresses[i];
            if (token == address(0) || priceFeed == address(0)) {
                revert StableCoinEngine__ZeroAddress();
            }
            s_priceFeeds[token] = priceFeed;
            s_collateralTokens.push(token);
        }

        i_stableCoin = StableCoin(stableCoinAddress);
        i_stableCoinPriceFeed = AggregatorV3Interface(stableCoinPriceFeedAddress);

        s_rate = RAY;
        s_lastStabilityFeeTimestamp = block.timestamp;
        s_currentStabilityFeeBps = BASE_STABILITY_FEE_BPS;
    }

    function depositCollateral(address tokenCollateralAddress, uint256 amountCollateral)
        external
        moreThanZero(amountCollateral)
        isAllowedToken(tokenCollateralAddress)
        nonReentrant
    {
        s_collateralDeposited[msg.sender][tokenCollateralAddress] += amountCollateral;
        emit CollateralDeposited(msg.sender, tokenCollateralAddress, amountCollateral);

        bool success = IERC20(tokenCollateralAddress).transferFrom(msg.sender, address(this), amountCollateral);
        if (!success) {
            revert StableCoinEngine__TransferFailed();
        }
    }

    function redeemCollateral(address tokenCollateralAddress, uint256 amountCollateral)
        external
        moreThanZero(amountCollateral)
        isAllowedToken(tokenCollateralAddress)
        nonReentrant
    {
        uint256 currentRate = _accrueStabilityFee();
        _redeemCollateral(tokenCollateralAddress, amountCollateral, msg.sender, msg.sender);
        _revertIfHealthFactorIsBroken(msg.sender, currentRate);
    }

    function mintStableCoin(uint256 amountStableCoinToMint) external moreThanZero(amountStableCoinToMint) nonReentrant {
        uint256 currentRate = _accrueStabilityFee();

        uint256 currentDebt = _debtFromNormalized(s_normalizedDebt[msg.sender], currentRate);
        s_normalizedDebt[msg.sender] = _toNormalizedDebt(currentDebt + amountStableCoinToMint, currentRate);
        _revertIfHealthFactorIsBroken(msg.sender, currentRate);

        bool minted = i_stableCoin.mint(msg.sender, amountStableCoinToMint);
        if (!minted) {
            revert StableCoinEngine__MintFailed();
        }

        emit StableCoinMinted(msg.sender, amountStableCoinToMint);
    }

    function burnStableCoin(uint256 amount) external moreThanZero(amount) nonReentrant {
        uint256 currentRate = _accrueStabilityFee();
        _burnStableCoin(amount, msg.sender, msg.sender, currentRate);
        _revertIfHealthFactorIsBroken(msg.sender, currentRate);
    }

    function liquidate(address tokenCollateralAddress, address user, uint256 debtToCover)
        external
        moreThanZero(debtToCover)
        isAllowedToken(tokenCollateralAddress)
        nonReentrant
    {
        uint256 currentRate = _accrueStabilityFee();

        uint256 startingUserHealthFactor = _healthFactor(user, currentRate);
        if (startingUserHealthFactor >= MIN_HEALTH_FACTOR) {
            revert StableCoinEngine__HealthFactorOk();
        }

        uint256 tokenAmountFromDebtCovered = getTokenAmountFromUsd(tokenCollateralAddress, debtToCover);
        uint256 bonusCollateral = (tokenAmountFromDebtCovered * LIQUIDATION_BONUS) / LIQUIDATION_PRECISION;
        uint256 totalCollateralToRedeem = tokenAmountFromDebtCovered + bonusCollateral;

        _redeemCollateral(tokenCollateralAddress, totalCollateralToRedeem, user, msg.sender);
        _burnStableCoin(debtToCover, user, msg.sender, currentRate);

        uint256 endingUserHealthFactor = _healthFactor(user, currentRate);
        if (endingUserHealthFactor <= startingUserHealthFactor) {
            revert StableCoinEngine__HealthFactorNotImproved();
        }
    }

    function dripStabilityFee() external returns (uint256 updatedRate) {
        updatedRate = _accrueStabilityFee();
    }

    function getAccountInformation(address user)
        external
        view
        returns (uint256 totalStableCoinMinted, uint256 collateralValueInUsd)
    {
        return _getAccountInformation(user, _previewRate());
    }

    function getAccountCollateralValueInUsd(address user) external view returns (uint256) {
        return _getAccountCollateralValueInUsd(user);
    }

    function getHealthFactor(address user) external view returns (uint256) {
        return _healthFactor(user, _previewRate());
    }

    function getUsdValue(address tokenCollateralAddress, uint256 amount) public view returns (uint256) {
        address priceFeedAddress = s_priceFeeds[tokenCollateralAddress];
        if (priceFeedAddress == address(0)) {
            revert StableCoinEngine__TokenNotAllowed(tokenCollateralAddress);
        }

        (, int256 price,,,) = AggregatorV3Interface(priceFeedAddress).staleCheckLatestRoundData();
        if (price <= 0) {
            revert StableCoinEngine__InvalidPrice();
        }

        return (uint256(price) * ADDITIONAL_FEED_PRECISION * amount) / PRECISION;
    }

    function getTokenAmountFromUsd(address tokenCollateralAddress, uint256 usdAmountInWei) public view returns (uint256) {
        address priceFeedAddress = s_priceFeeds[tokenCollateralAddress];
        if (priceFeedAddress == address(0)) {
            revert StableCoinEngine__TokenNotAllowed(tokenCollateralAddress);
        }

        (, int256 price,,,) = AggregatorV3Interface(priceFeedAddress).staleCheckLatestRoundData();
        if (price <= 0) {
            revert StableCoinEngine__InvalidPrice();
        }

        return (usdAmountInWei * PRECISION) / (uint256(price) * ADDITIONAL_FEED_PRECISION);
    }

    function getCollateralBalanceOfUser(address user, address tokenCollateralAddress) external view returns (uint256) {
        return s_collateralDeposited[user][tokenCollateralAddress];
    }

    function getStableCoinMinted(address user) external view returns (uint256) {
        return _debtFromNormalized(s_normalizedDebt[user], _previewRate());
    }

    function getNormalizedDebt(address user) external view returns (uint256) {
        return s_normalizedDebt[user];
    }

    function getCollateralTokens() external view returns (address[] memory) {
        return s_collateralTokens;
    }

    function getPriceFeed(address tokenCollateralAddress) external view returns (address) {
        return s_priceFeeds[tokenCollateralAddress];
    }

    function getStableCoinAddress() external view returns (address) {
        return address(i_stableCoin);
    }

    function getStableCoinPriceFeed() external view returns (address) {
        return address(i_stableCoinPriceFeed);
    }

    function getLiquidationThreshold() external pure returns (uint256) {
        return LIQUIDATION_THRESHOLD;
    }

    function getLiquidationBonus() external pure returns (uint256) {
        return LIQUIDATION_BONUS;
    }

    function getMinHealthFactor() external pure returns (uint256) {
        return MIN_HEALTH_FACTOR;
    }

    function getRate() external view returns (uint256) {
        return s_rate;
    }

    function getPreviewRate() external view returns (uint256) {
        return _previewRate();
    }

    function getCurrentStabilityFeeBps() external view returns (uint256) {
        return _targetStabilityFeeBps();
    }

    function getAppliedStabilityFeeBps() external view returns (uint256) {
        return s_currentStabilityFeeBps;
    }

    function getLastStabilityFeeTimestamp() external view returns (uint256) {
        return s_lastStabilityFeeTimestamp;
    }

    function getBaseStabilityFeeBps() external pure returns (uint256) {
        return BASE_STABILITY_FEE_BPS;
    }

    function getMinStabilityFeeBps() external pure returns (uint256) {
        return MIN_STABILITY_FEE_BPS;
    }

    function getMaxStabilityFeeBps() external pure returns (uint256) {
        return MAX_STABILITY_FEE_BPS;
    }

    function getPegPrice() external pure returns (uint256) {
        return PEG_PRICE;
    }

    function _burnStableCoin(uint256 amountStableCoinToBurn, address onBehalfOf, address stableCoinFrom, uint256 rate)
        internal
    {
        uint256 mintedAmount = _debtFromNormalized(s_normalizedDebt[onBehalfOf], rate);
        if (mintedAmount < amountStableCoinToBurn) {
            revert StableCoinEngine__BurnAmountExceedsMinted(amountStableCoinToBurn, mintedAmount);
        }

        s_normalizedDebt[onBehalfOf] = _toNormalizedDebt(mintedAmount - amountStableCoinToBurn, rate);
        i_stableCoin.burn(stableCoinFrom, amountStableCoinToBurn);

        emit StableCoinBurned(onBehalfOf, amountStableCoinToBurn);
    }

    function _redeemCollateral(address tokenCollateralAddress, uint256 amountCollateral, address from, address to) internal {
        uint256 collateralBalance = s_collateralDeposited[from][tokenCollateralAddress];
        if (collateralBalance < amountCollateral) {
            revert StableCoinEngine__InsufficientCollateral();
        }

        s_collateralDeposited[from][tokenCollateralAddress] = collateralBalance - amountCollateral;
        emit CollateralRedeemed(from, to, tokenCollateralAddress, amountCollateral);

        bool success = IERC20(tokenCollateralAddress).transfer(to, amountCollateral);
        if (!success) {
            revert StableCoinEngine__TransferFailed();
        }
    }

    function _getAccountInformation(address user, uint256 rate)
        internal
        view
        returns (uint256 totalStableCoinMinted, uint256 collateralValueInUsd)
    {
        totalStableCoinMinted = _debtFromNormalized(s_normalizedDebt[user], rate);
        collateralValueInUsd = _getAccountCollateralValueInUsd(user);
    }

    function _healthFactor(address user, uint256 rate) internal view returns (uint256) {
        (uint256 totalStableCoinMinted, uint256 collateralValueInUsd) = _getAccountInformation(user, rate);
        return _calculateHealthFactor(totalStableCoinMinted, collateralValueInUsd);
    }

    function _calculateHealthFactor(uint256 totalStableCoinMinted, uint256 collateralValueInUsd)
        internal
        pure
        returns (uint256)
    {
        if (totalStableCoinMinted == 0) {
            return type(uint256).max;
        }

        uint256 collateralAdjustedForThreshold =
            (collateralValueInUsd * LIQUIDATION_THRESHOLD) / LIQUIDATION_PRECISION;
        return (collateralAdjustedForThreshold * PRECISION) / totalStableCoinMinted;
    }

    function _getAccountCollateralValueInUsd(address user) internal view returns (uint256 totalCollateralValueInUsd) {
        for (uint256 i = 0; i < s_collateralTokens.length; i++) {
            address tokenCollateralAddress = s_collateralTokens[i];
            uint256 amount = s_collateralDeposited[user][tokenCollateralAddress];
            if (amount == 0) {
                continue;
            }
            totalCollateralValueInUsd += getUsdValue(tokenCollateralAddress, amount);
        }
    }

    function _accrueStabilityFee() internal returns (uint256 updatedRate) {
        updatedRate = s_rate;
        uint256 timeElapsed = block.timestamp - s_lastStabilityFeeTimestamp;
        if (timeElapsed == 0) {
            return updatedRate;
        }

        uint256 annualizedFeeBps = _targetStabilityFeeBps();
        s_currentStabilityFeeBps = annualizedFeeBps;

        uint256 rateIncrease = (updatedRate * annualizedFeeBps * timeElapsed) / (BPS_DENOMINATOR * SECONDS_PER_YEAR);
        updatedRate += rateIncrease;

        s_rate = updatedRate;
        s_lastStabilityFeeTimestamp = block.timestamp;
        emit StabilityFeeAccrued(annualizedFeeBps, updatedRate, timeElapsed);
    }

    function _previewRate() internal view returns (uint256) {
        uint256 updatedRate = s_rate;
        uint256 timeElapsed = block.timestamp - s_lastStabilityFeeTimestamp;
        if (timeElapsed == 0) {
            return updatedRate;
        }

        uint256 annualizedFeeBps = _targetStabilityFeeBps();
        uint256 rateIncrease = (updatedRate * annualizedFeeBps * timeElapsed) / (BPS_DENOMINATOR * SECONDS_PER_YEAR);
        return updatedRate + rateIncrease;
    }

    function _targetStabilityFeeBps() internal view returns (uint256) {
        uint256 stableCoinPrice = _stableCoinPrice();

        if (stableCoinPrice < PEG_PRICE) {
            uint256 deviationBps = ((PEG_PRICE - stableCoinPrice) * BPS_DENOMINATOR) / PEG_PRICE;
            if (deviationBps <= PEG_DEVIATION_DEADBAND_BPS) {
                return BASE_STABILITY_FEE_BPS;
            }

            uint256 adjustedFeeBps =
                BASE_STABILITY_FEE_BPS + ((deviationBps - PEG_DEVIATION_DEADBAND_BPS) * BELOW_PEG_FEE_SENSITIVITY);
            if (adjustedFeeBps > MAX_STABILITY_FEE_BPS) {
                return MAX_STABILITY_FEE_BPS;
            }
            return adjustedFeeBps;
        }

        uint256 positiveDeviationBps = ((stableCoinPrice - PEG_PRICE) * BPS_DENOMINATOR) / PEG_PRICE;
        if (positiveDeviationBps <= PEG_DEVIATION_DEADBAND_BPS) {
            return BASE_STABILITY_FEE_BPS;
        }

        uint256 feeReduction = (positiveDeviationBps - PEG_DEVIATION_DEADBAND_BPS) * ABOVE_PEG_FEE_SENSITIVITY;
        if (feeReduction >= BASE_STABILITY_FEE_BPS) {
            return MIN_STABILITY_FEE_BPS;
        }

        uint256 reducedFeeBps = BASE_STABILITY_FEE_BPS - feeReduction;
        if (reducedFeeBps < MIN_STABILITY_FEE_BPS) {
            return MIN_STABILITY_FEE_BPS;
        }
        return reducedFeeBps;
    }

    function _stableCoinPrice() internal view returns (uint256 normalizedPrice) {
        (, int256 price,,,) = i_stableCoinPriceFeed.staleCheckLatestRoundData();
        if (price <= 0) {
            revert StableCoinEngine__InvalidPrice();
        }

        uint8 feedDecimals = i_stableCoinPriceFeed.decimals();
        if (feedDecimals > 18) {
            normalizedPrice = uint256(price) / (10 ** (feedDecimals - 18));
        } else {
            normalizedPrice = uint256(price) * (10 ** (18 - feedDecimals));
        }
    }

    function _toNormalizedDebt(uint256 debtAmount, uint256 rate) internal pure returns (uint256) {
        if (debtAmount == 0) {
            return 0;
        }
        return ((debtAmount * RAY) + rate - 1) / rate;
    }

    function _debtFromNormalized(uint256 normalizedDebt, uint256 rate) internal pure returns (uint256) {
        if (normalizedDebt == 0) {
            return 0;
        }
        return ((normalizedDebt * rate) + RAY - 1) / RAY;
    }

    function _revertIfHealthFactorIsBroken(address user, uint256 rate) internal view {
        uint256 userHealthFactor = _healthFactor(user, rate);
        if (userHealthFactor < MIN_HEALTH_FACTOR) {
            revert StableCoinEngine__BreaksHealthFactor(userHealthFactor);
        }
    }
}
