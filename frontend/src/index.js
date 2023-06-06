import React from 'react';
import ReactDOM from 'react-dom';
import {v1 as uuid} from "uuid";
import axios from 'axios';
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { context, trace, propagation } from '@opentelemetry/api';
import { CompositePropagator, W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

/** header names */
const TRACE_ID_HEADER = 'traceparent';
const CORRELATION_HEADER = 'x-correlation-id';

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
    console.log("I AM IN INJECT")
    const spanContext = trace.getSpan(context)?.spanContext();
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
    console.log(spanContext)
    return trace.setSpanContext(context, spanContext);
  };

  fields() {
    return [CORRELATION_HEADER, TRACE_ID_HEADER];
  }
}

propagation.setGlobalPropagator(
  new CompositePropagator({
    propagators: [
      new W3CTraceContextPropagator(),
      new CustomPropagator(),
    ],
  })
);

// const exporter = new OTLPTraceExporter({
  // url: "http://localhost:4318/v1/traces",
  // url: "https://api.honeycomb.io",
//   headers: {
//     "x-honeycomb-team": process.env.HONEYCOMB_API_KEY,
//   },
// })

const provider = new WebTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'react-svc',
  }),
});

// provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

provider.register({
  // Changing default contextManager to use ZoneContextManager - supports asynchronous operations - optional
  contextManager: new ZoneContextManager(),
});

registerInstrumentations({
  instrumentations: [
    getWebAutoInstrumentations({
      // load custom configuration for xml-http-request instrumentation
      '@opentelemetry/instrumentation-xml-http-request': {
        propagateTraceHeaderCorsUrls: [
            /.+/g, //Regex to match your backend urls. This should be updated.
          ],
      },
      '@opentelemetry/instrumentation-fetch': {
        propagateTraceHeaderCorsUrls: [
            /.+/g, //Regex to match your backend urls. This should be updated.
          ],
      },
    }),
  ],
});


class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      items: [],
    };
  }

  componentDidMount() {
    const correlationId = uuid();
    console.log(`Correlation ID: ${correlationId}`);
    console.log(`Active Context: ${context.active()}`)
    axios.defaults.headers.common['x-correlation-id'] = correlationId;
    axios.get('http://localhost:3000/api')
    .then((response) => {
      console.log(response.data);
    })
    .then(
      (result) => {
        this.setState({
          isLoaded: true
        });
      });
  }

  render() {
    const {error, isLoaded} = this.state;
    if (error) {
      return <div>Error: {error}</div>;
    } else if (!isLoaded) {
      return <div>Loading...</div>;
    } else {
      return (
        <div>API returned a response</div>
      );
    }
  }
}


ReactDOM.render(
  <App/>,
  document.getElementById('root')
);
