import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',globalSetup:'./e2e/setup.js',workers:1,timeout:30000,use:{baseURL:'http://127.0.0.1:4191',headless:true,viewport:{width:1440,height:1000},video:'on',screenshot:'only-on-failure'},webServer:{command:'npm start',url:'http://127.0.0.1:4191/__chain_reactor_health_v1',reuseExistingServer:true}});
