# Cấu trúc đề xuất

iot-smart-watering-system/
├── edge/                       
│   ├── src/
│   │   ├── sensors/            
│   │   ├── actuators/          
│   │   └── main.cpp            
│   ├── include/                
│   └── config/
│       └── mqtt_config.json    
│
├── data-analysis/              
│   ├── src/
│   │   ├── receiver/           
│   │   ├── processor/          
│   │   └── anomaly_detect/     
│   └── requirements.txt        
│
├── load-balancer/              
│   ├── src/
│   │   ├── mqtt_subscriber/    
│   │   └── http_router/        
│   └── config/
│       └── upstream.conf       
│
├── backend/                    
│   ├── src/
│   │   ├── api/                
│   │   ├── services/           
│   │   ├── patterns/           
│   │   │   ├── observer/       
│   │   │   ├── factory/        
│   │   │   └── singleton/      
│   │   └── models/             
│   └── package.json            
│
├── frontend/                   
│   ├── src/
│   │   ├── components/         
│   │   ├── pages/
│   │   │   ├── monitoring/     
│   │   │   └── remote_control/ 
│   │   └── services/           
│   └── package.json            
│
├── .gitignore                  
└── README.md                   