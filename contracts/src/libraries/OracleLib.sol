// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "chainlink-brownie-contracts/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title OracleLib
 * @author SCP Team
 * @notice This library is used to check the Chainlink Oracle for stale data.
 * If a price is stale, the function will revert, and render the StableCoinEngine unusable - this is by design.
 * We want the StableCoinEngine to freeze if prices are stale.
 *
 * So if the Chainlink network goes down and the heartbeat expires, the protocol will freeze.
 */
library OracleLib {
    error OracleLib__StalePrice();
    error OracleLib__InvalidPrice();
    error OracleLib__CircuitBreakerTriggered(uint256 previousPrice, uint256 currentPrice, uint256 deviationBps);
    error OracleLib__OracleMismatch(uint256 primaryPrice, uint256 secondaryPrice, uint256 deviationBps);

    uint256 private constant TIMEOUT = 3 hours; // 3 * 60 * 60 = 10800 seconds
    uint256 private constant BPS_DENOMINATOR = 10_000;

    struct OracleState {
        uint256 twapPrice;
        uint256 lastPrice;
        uint256 lastUpdateTimestamp;
        bool initialized;
    }

    struct OracleConfig {
        uint256 maxDeviationBps;
        uint256 shortCircuitBreakerWindow;
        uint256 circuitBreakerResetWindow;
        uint256 twapWindow;
    }

    function staleCheckLatestRoundData(AggregatorV3Interface priceFeed)
        public
        view
        returns (uint80, int256, uint256, uint256, uint80)
    {
        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) =
            priceFeed.latestRoundData();

        uint256 secondsSinceLastUpdate = block.timestamp - updatedAt;
        if (secondsSinceLastUpdate > TIMEOUT) {
            revert OracleLib__StalePrice();
        }

        return (roundId, answer, startedAt, updatedAt, answeredInRound);
    }

    function readValidatedPrice(
        AggregatorV3Interface priceFeed,
        OracleState storage oracleState,
        OracleConfig memory oracleConfig
    ) internal returns (uint256) {
        return readValidatedPrice(priceFeed, AggregatorV3Interface(address(0)), oracleState, oracleConfig);
    }

    function readValidatedPrice(
        AggregatorV3Interface primaryFeed,
        AggregatorV3Interface secondaryFeed,
        OracleState storage oracleState,
        OracleConfig memory oracleConfig
    ) internal returns (uint256 validatedPrice) {
        uint256 primaryPrice = _normalizedPrice(primaryFeed);
        uint256 secondaryPrice = _secondaryPrice(secondaryFeed);

        if (!oracleState.initialized) {
            oracleState.twapPrice = primaryPrice;
            oracleState.lastPrice = primaryPrice;
            oracleState.lastUpdateTimestamp = block.timestamp;
            oracleState.initialized = true;
            return primaryPrice;
        }

        uint256 elapsed = block.timestamp - oracleState.lastUpdateTimestamp;
        bool resetWindowPassed = elapsed > oracleConfig.circuitBreakerResetWindow;

        if (!resetWindowPassed && elapsed > 0 && elapsed <= oracleConfig.shortCircuitBreakerWindow) {
            uint256 circuitDeviationBps = _deviationBps(primaryPrice, oracleState.lastPrice);
            if (circuitDeviationBps > oracleConfig.maxDeviationBps) {
                revert OracleLib__CircuitBreakerTriggered(oracleState.lastPrice, primaryPrice, circuitDeviationBps);
            }
        }

        uint256 previousTwap = oracleState.twapPrice == 0 ? oracleState.lastPrice : oracleState.twapPrice;
        uint256 nextTwap = resetWindowPassed ? primaryPrice : _calculateTwap(previousTwap, primaryPrice, elapsed, oracleConfig.twapWindow);

        uint256 comparisonPrice = secondaryPrice == 0 ? nextTwap : secondaryPrice;
        if (comparisonPrice > 0) {
            uint256 deviationBps = _deviationBps(primaryPrice, comparisonPrice);
            if (deviationBps > oracleConfig.maxDeviationBps) {
                revert OracleLib__OracleMismatch(primaryPrice, comparisonPrice, deviationBps);
            }
        }

        oracleState.twapPrice = nextTwap;
        oracleState.lastPrice = primaryPrice;
        oracleState.lastUpdateTimestamp = block.timestamp;

        return primaryPrice;
    }

    function peekValidatedPrice(
        AggregatorV3Interface priceFeed,
        OracleState storage oracleState,
        OracleConfig memory oracleConfig
    ) internal view returns (uint256) {
        return peekValidatedPrice(priceFeed, AggregatorV3Interface(address(0)), oracleState, oracleConfig);
    }

    function peekValidatedPrice(
        AggregatorV3Interface primaryFeed,
        AggregatorV3Interface secondaryFeed,
        OracleState storage oracleState,
        OracleConfig memory oracleConfig
    ) internal view returns (uint256 validatedPrice) {
        uint256 primaryPrice = _normalizedPrice(primaryFeed);
        uint256 secondaryPrice = _secondaryPrice(secondaryFeed);

        if (!oracleState.initialized) {
            return primaryPrice;
        }

        uint256 elapsed = block.timestamp - oracleState.lastUpdateTimestamp;
        bool resetWindowPassed = elapsed > oracleConfig.circuitBreakerResetWindow;

        if (!resetWindowPassed && elapsed > 0 && elapsed <= oracleConfig.shortCircuitBreakerWindow) {
            uint256 circuitDeviationBps = _deviationBps(primaryPrice, oracleState.lastPrice);
            if (circuitDeviationBps > oracleConfig.maxDeviationBps) {
                revert OracleLib__CircuitBreakerTriggered(oracleState.lastPrice, primaryPrice, circuitDeviationBps);
            }
        }

        uint256 comparisonPrice = secondaryPrice;
        if (comparisonPrice == 0 && !resetWindowPassed) {
            uint256 currentTwap = oracleState.twapPrice == 0 ? oracleState.lastPrice : oracleState.twapPrice;
            comparisonPrice = _calculateTwap(currentTwap, primaryPrice, elapsed, oracleConfig.twapWindow);
        }

        if (comparisonPrice > 0) {
            uint256 deviationBps = _deviationBps(primaryPrice, comparisonPrice);
            if (deviationBps > oracleConfig.maxDeviationBps) {
                revert OracleLib__OracleMismatch(primaryPrice, comparisonPrice, deviationBps);
            }
        }

        return primaryPrice;
    }

    function _secondaryPrice(AggregatorV3Interface secondaryFeed) private view returns (uint256) {
        if (address(secondaryFeed) == address(0)) {
            return 0;
        }

        return _normalizedPrice(secondaryFeed);
    }

    function _normalizedPrice(AggregatorV3Interface priceFeed) private view returns (uint256 normalizedPrice) {
        (, int256 answer,, uint256 updatedAt,) = priceFeed.latestRoundData();
        if (updatedAt == 0 || updatedAt > block.timestamp) {
            revert OracleLib__StalePrice();
        }

        uint256 secondsSinceLastUpdate = block.timestamp - updatedAt;
        if (secondsSinceLastUpdate > TIMEOUT) {
            revert OracleLib__StalePrice();
        }
        if (answer <= 0) {
            revert OracleLib__InvalidPrice();
        }

        uint8 feedDecimals = priceFeed.decimals();
        if (feedDecimals > 18) {
            normalizedPrice = uint256(answer) / (10 ** (feedDecimals - 18));
        } else {
            normalizedPrice = uint256(answer) * (10 ** (18 - feedDecimals));
        }
    }

    function _calculateTwap(uint256 previousTwap, uint256 currentPrice, uint256 elapsed, uint256 twapWindow)
        private
        pure
        returns (uint256)
    {
        if (twapWindow == 0 || elapsed >= twapWindow) {
            return currentPrice;
        }
        if (elapsed == 0) {
            return previousTwap;
        }

        uint256 previousWeight = twapWindow - elapsed;
        return ((previousTwap * previousWeight) + (currentPrice * elapsed)) / twapWindow;
    }

    function _deviationBps(uint256 currentPrice, uint256 referencePrice) private pure returns (uint256) {
        if (referencePrice == 0) {
            return type(uint256).max;
        }

        uint256 priceDelta = currentPrice >= referencePrice ? currentPrice - referencePrice : referencePrice - currentPrice;
        return (priceDelta * BPS_DENOMINATOR) / referencePrice;
    }
}
