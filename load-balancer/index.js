const { startRouter } = require('./src/http_router/router'); 
const { startSubscriber } = require('./src/mqtt_subscriber/subscriber'); 

console.log("=== Đang khởi động Hệ thống Load Balancer ===");

startRouter();
startSubscriber();