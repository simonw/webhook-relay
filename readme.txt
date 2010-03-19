webhook-relay
=============

A Node.js server for forwarding webhook requests in a non-blocking
manner.

Webhooks are brilliant, but implementing them as a provider is a 
little tricky as your application has to make HTTP request to 
arbitrary endpoints when specific actions occur. If there are 
many of those endpoints and some of them are slow to respond, 
this could degrade the performance of your application.

A common solution to this problem is to place outgoing webhook 
requests in a queue. webhook-relay is a self-contained queue and 
response sending agent. You send it an HTTP POST describing the 
webhook request that needs to be sent, it replies instantly with 
an "OK", and the request itself is sent off shortly afterwards.

webhook-relay should respond within 20-30ms, so your main 
application can safely block on the call to webhook-relay.

webhook-relay also tracks statistics on the number of calls it 
has made and how long they took to send.

