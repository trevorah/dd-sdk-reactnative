/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * A configuration object to initialize Datadog's features.
 */
export class DdSdkConfiguration {
  constructor(
    readonly clientToken: string,
    readonly env: string,
    readonly applicationId: string
  ) {}
}

/**
 * The entry point to initialize Datadog's features.
 */
export type DdSdkType = {
  /**
   * Initializes Datadog's features.
   * configuration: The configuration to use.
   */
  initialize(configuration: DatadogConfiguration): Promise<void>;
};

/**
 * The entry point to use Datadog's Logs feature.
 */
export type DdLogsType = {
  /**
   * Send a log with level debug.
   * message: The message to send.
   * context: The additional context to send.
   */
  debug(message: string, context: object): Promise<void>;

  /**
   * Send a log with level info.
   * message: The message to send.
   * context: The additional context to send.
   */
  info(message: string, context: object): Promise<void>;

  /**
   * Send a log with level warn.
   * message: The message to send.
   * context: The additional context to send.
   */
  warn(message: string, context: object): Promise<void>;

  /**
   * Send a log with level error.
   * message: The message to send.
   * context: The additional context to send.
   */
  error(message: string, context: object): Promise<void>;
};

/**
 * The entry point to use Datadog's Trace feature.
 */
export type DdTraceType = {
  /**
   * Start a span, and returns a unique identifier for the span.
   * operation: The operation name of the span.
   * timestamp: The timestamp when the operation started.
   * context: The additional context to send.
   */
  startSpan(
    operation: string,
    timestamp: number,
    context: object
  ): Promise<string>;

  /**
   * Finish a started span.
   * spanId: The unique identifier of the span.
   * timestamp: The timestamp when the operation stopped.
   * context: The additional context to send.
   */
  finishSpan(spanId: string, timestamp: number, context: object): Promise<void>;
};

/**
 * The entry point to use Datadog's RUM feature.
 */
export type DdRumType = {
  /**
   * Start tracking a RUM View.
   * key: The view unique key identifier.
   * name: The view name.
   * timestamp: The timestamp when the view started.
   * context: The additional context to send.
   */
  startView(
    key: string,
    name: string,
    timestamp: number,
    context: object
  ): Promise<void>;

  /**
   * Stop tracking a RUM View.
   * key: The view unique key identifier.
   * timestamp: The timestamp when the view stopped.
   * context: The additional context to send.
   */
  stopView(key: string, timestamp: number, context: object): Promise<void>;

  /**
   * Start tracking a RUM Action.
   * type: The action type (tap, scroll, swipe, click, custom).
   * name: The action name.
   * timestamp: The timestamp when the action started.
   * context: The additional context to send.
   */
  startAction(
    type: string,
    name: string,
    timestamp: number,
    context: object
  ): Promise<void>;

  /**
   * Stop tracking the ongoing RUM Action.
   * timestamp: The timestamp when the action stopped.
   * context: The additional context to send.
   */
  stopAction(timestamp: number, context: object): Promise<void>;

  /**
   * Add a RUM Action.
   * type: The action type (tap, scroll, swipe, click, custom).
   * name: The action name.
   * timestamp: The timestamp when the action occured.
   * context: The additional context to send.
   */
  addAction(
    type: string,
    name: string,
    timestamp: number,
    context: object
  ): Promise<void>;

  /**
   * Start tracking a RUM Resource.
   * key: The resource unique key identifier.
   * method: The resource method (GET, POST, …).
   * url: The resource url.
   * timestamp: The timestamp when the resource started.
   * context: The additional context to send.
   */
  startResource(
    key: string,
    method: string,
    url: string,
    timestamp: number,
    context: object
  ): Promise<void>;

  /**
   * Stop tracking a RUM Resource.
   * key: The resource unique key identifier.
   * statusCode: The resource status code.
   * kind: The resource's kind (xhr, document, image, css, font, …).
   * timestamp: The timestamp when the resource stopped.
   * context: The additional context to send.
   */
  stopResource(
    key: string,
    statusCode: number,
    kind: string,
    timestamp: number,
    context: object
  ): Promise<void>;

  /**
   * Add a RUM Error.
   * message: The error message.
   * source: The error source (network, source, console, logger, …).
   * stacktrace: The error stacktrace.
   * timestamp: The timestamp when the error occured.
   * context: The additional context to send.
   */
  addError(
    message: string,
    source: string,
    stacktrace: string,
    timestamp: number,
    context: object
  ): Promise<void>;
};
