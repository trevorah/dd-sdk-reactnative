/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRum } from '../../foundation'
import type { DdRumXhr, DdRumXhrContext } from './DdRumXhr'
import { generateTraceId } from './TraceIdentifier';

export const TRACE_ID_HEADER_KEY = "x-datadog-trace-id"
export const PARENT_ID_HEADER_KEY = "x-datadog-parent-id"
export const ORIGIN_HEADER_KEY = "x-datadog-origin"
export const ORIGIN_RUM = "rum"

const MISSING_TIME = -1

type Duration = number & { d: 'Duration in ms' }
type ServerDuration = number & { s: 'Duration in ns' }

interface Timing {
  startTime: ServerDuration
  duration: ServerDuration
}

interface ResourceTimings {
  // unlike in Performance API it is not the time until request
  // starts (requestStart, before it can be connect, SSL, DNS),
  // but the time until the response is first seen
  firstByte: Timing,
  download: Timing,
}

function createTimings(requestContext: DdRumXhrContext, responseEndTime: number): ResourceTimings | null {
  const {
    startTime,
    loadStartTime
  } = requestContext

  if (startTime === MISSING_TIME || loadStartTime === MISSING_TIME) {
    return null
  }

  const firstByte = formatTiming(startTime, startTime, loadStartTime)
  const download = formatTiming(startTime, loadStartTime, responseEndTime)

  return {
    firstByte,
    download
  }
}

function formatTiming(origin: number, start: number, end: number): Timing {
  return {
    duration: toServerDuration((end - start) as Duration),
    startTime: toServerDuration((start - origin) as Duration),
  }
}

function toServerDuration(duration: Duration) {
  return round(duration * 1e6, 0) as ServerDuration
}

function round(num: number, decimals: 0 | 1 | 2 | 3 | 4) {
  return +num.toFixed(decimals)
}

/**
* Provides RUM auto-instrumentation feature to track resources (fetch, XHR, axios) as RUM events.
*/
export class DdRumResourceTracking {

  private static isTracking = false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static originalXhrOpen: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static originalXhrSend: any

  /**
  * Starts tracking resources and sends a RUM Resource event every time a network request is detected.
  */
  static startTracking(): void {
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequest);
  }

  /**
  * Starts tracking resources and sends a RUM Resource event every time a fetch or XHR call is detected.
  */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
  static startTrackingInternal(xhrType: any): void {
    // extra safety to avoid proxying the XHR class twice
    if (DdRumResourceTracking.isTracking) {
      return
    }

    DdRumResourceTracking.originalXhrOpen = xhrType.prototype.open;
    DdRumResourceTracking.originalXhrSend = xhrType.prototype.send;

    DdRumResourceTracking.proxyXhr(xhrType)
  }


  static stopTracking(): void {
    if (DdRumResourceTracking.isTracking) {
      DdRumResourceTracking.isTracking = false;
      XMLHttpRequest.prototype.open = DdRumResourceTracking.originalXhrOpen;
      XMLHttpRequest.prototype.send = DdRumResourceTracking.originalXhrSend;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
  static proxyXhr(xhrType: any): void {
    this.proxyOpen(xhrType);
    this.proxySend(xhrType);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static proxyOpen(xhrType: any): void {
    const originalXhrOpen = this.originalXhrOpen;
    xhrType.prototype.open = function (this: DdRumXhr, method: string, url: string) {
      // Keep track of the method and url
      // start time is tracked by the `send` method
      const spanId = generateTraceId()
      const traceId = generateTraceId()
      this._datadog_xhr = {
        method,
        startTime: MISSING_TIME,
        loadStartTime: MISSING_TIME,
        url: url,
        reported: false,
        spanId: spanId,
        traceId: traceId
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any,prefer-rest-params
      return originalXhrOpen.apply(this, arguments as any)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static proxySend(xhrType: any): void {
    const originalXhrSend = this.originalXhrSend;
    xhrType.prototype.send = function (this: DdRumXhr) {

      if (this._datadog_xhr) {
        // keep track of start time
        this._datadog_xhr.startTime = Date.now()
        this.setRequestHeader(TRACE_ID_HEADER_KEY, this._datadog_xhr.traceId)
        this.setRequestHeader(PARENT_ID_HEADER_KEY, this._datadog_xhr.spanId)
        this.setRequestHeader(ORIGIN_HEADER_KEY, ORIGIN_RUM)

      }

      DdRumResourceTracking.proxyOnReadyStateChange(this, xhrType);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any,prefer-rest-params
      return originalXhrSend.apply(this, arguments as any);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static proxyOnReadyStateChange(xhrProxy: DdRumXhr, xhrType: any): void {
    const originalOnreadystatechange = xhrProxy.onreadystatechange
    xhrProxy.onreadystatechange = function () {
      if (xhrProxy.readyState === xhrType.DONE) {
        if (!xhrProxy._datadog_xhr.reported) {
          DdRumResourceTracking.reportXhr(xhrProxy);
          xhrProxy._datadog_xhr.reported = true;
        }
      } else if (xhrProxy.readyState === xhrType.LOADING
        && xhrProxy._datadog_xhr.loadStartTime === MISSING_TIME) {
        xhrProxy._datadog_xhr.loadStartTime = Date.now()
      }

      if (originalOnreadystatechange) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any,prefer-rest-params
        originalOnreadystatechange.apply(xhrProxy, arguments as any)
      }
    }
  }

  private static reportXhr(xhrProxy: DdRumXhr): void {

    const context = xhrProxy._datadog_xhr

    const key = context.startTime + "/"
      + context.method + "/"
      + context.startTime

    const responseEndTime = Date.now()

    DdRum.startResource(
      key,
      context.method,
      context.url,
      context.startTime,
      {
        "_dd.span_id": context.spanId,
        "_dd.trace_id": context.traceId
      }
    ).then(() => {
      DdRum.stopResource(
        key,
        xhrProxy.status,
        "xhr",
        responseEndTime,
        {
          "_dd.timings": createTimings(context, responseEndTime),
        });
    })
  }

}
