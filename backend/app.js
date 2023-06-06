const express = require('express');
const app = express();
const api = require('@opentelemetry/api');
const tracer = api.trace.getTracer('app_or_package_name', '1.0.0')
const cors = require('cors')

app.use(cors())
  
// Example API route
app.get('/api', (req, res) => {
  console.log('API request received');
  console.log(`Headers: ${JSON.stringify(req.headers)}`);
  console.log(`Correlation ID: ${req.headers['x-correlation-id']}`)
  api.context.active().traceId = req.headers['x-correlation-id']
  // Create a span with name "operation-name" and kind="server".
  tracer.startActiveSpan('operation-name', (span) => {
    console.log('API request received');
    span.end()
  });
  res.send('API response');
});

// Start the server
app.listen(3000, () => {
  console.log('Server started on port 3000');
});
