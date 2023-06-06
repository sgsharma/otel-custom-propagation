const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-node');
const api = require("@opentelemetry/api");
const { CompositePropagator } = require("@opentelemetry/core");
// const { W3CTraceContextPropagator } = require("@opentelemetry/core");
// const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-proto');
// const { Resource } = require('@opentelemetry/resources');
// const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

/** header names */
const TRACE_ID_HEADER = 'traceparent';
const CORRELATION_HEADER = 'x-correlation-id';

const VERSION = '00';
const VERSION_PART = '(?!ff)[\\da-f]{2}';
const TRACE_ID_PART = '(?![0]{32})[\\da-f]{32}';
const PARENT_ID_PART = '(?![0]{16})[\\da-f]{16}';
const FLAGS_PART = '[\\da-f]{2}';
const TRACE_PARENT_REGEX = new RegExp(
  `^\\s?(${VERSION_PART})-(${TRACE_ID_PART})-(${PARENT_ID_PART})-(${FLAGS_PART})(-.*)?\\s?$`
);

function parseTraceParent(traceParent, correlationId) {
  const corrId = correlationId.replace(/-/g, "");
  const match = TRACE_PARENT_REGEX.exec(traceParent);
  if (!match) return null;
  if (match[1] === '00' && match[5]) return null;
  return {
    traceId: corrId,
    spanId: match[3],
    traceFlags: parseInt(match[4], 16),
  }
};

/**
 * Propagator for the HTTP headers.
 */
class CustomPropagator {
  inject(context, carrier) {
    const spanContext = api.trace.getSpan(context)?.spanContext();
    if (!spanContext || !isSpanContextValid(spanContext)) {
      return;
    }
    const SPAN_ID_HEADER = parseTraceParent(TextMapGetter.get(carrier, TRACE_ID_HEADER), TextMapGetter.get(carrier, CORRELATION_HEADER))?.spanId;
    TextMapSetter.set(carrier, "traceId", spanContext.traceId);
  }
  extract(context, carrier, getter) {
    const TRACE_ID_HEADER = 'traceparent';
    const CORRELATION_HEADER = 'x-correlation-id';
    const spanContext = parseTraceParent(getter.get(carrier, TRACE_ID_HEADER), getter.get(carrier, CORRELATION_HEADER));
    spanContext.isRemote = true;
    return api.trace.setSpanContext(context, spanContext);
  };

  fields() {
    return [CORRELATION_HEADER, TRACE_ID_HEADER];
  }
}

api.propagation.setGlobalPropagator(
  new CompositePropagator({
    propagators: [
      new W3CTraceContextPropagator(),
      new CustomPropagator(),
    ],
  })
);

// const exporter = new OTLPTraceExporter({
//   url: "https://api.honeycomb.io",
//   headers: {
//     "x-honeycomb-team": 'sQ0jRynr3q8eFMExVbQltD'
//   },
// })

const sdk = new NodeSDK({
  // traceExporter: exporter,
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [new HttpInstrumentation()],
});

sdk.start()
