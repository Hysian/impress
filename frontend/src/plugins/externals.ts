import React from "react";
import ReactDOM from "react-dom";
import * as ReactRouterDOM from "react-router-dom";
import * as ReactI18next from "react-i18next";

/**
 * Expose shared dependencies on window for external theme bundles.
 * External themes can use these instead of bundling their own React.
 */
(window as any).__IMPRESS_SHARED__ = {
  React,
  ReactDOM,
  ReactRouterDOM,
  ReactI18next,
};
