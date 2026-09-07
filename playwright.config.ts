import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',timeout:90000,fullyParallel:false,
 use:{baseURL:'http://127.0.0.1:5179',channel:process.env.CI?'chromium':'chrome',headless:true,viewport:{width:1440,height:960}},
 webServer:{command:'npm run dev -- --port 5179 --strictPort',url:'http://127.0.0.1:5179',reuseExistingServer:!process.env.CI},
 reporter:'list'
});