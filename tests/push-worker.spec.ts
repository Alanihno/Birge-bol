import {test,expect} from '@playwright/test';

test('installed push handler passes only fixed neutral text to the browser display API',async({page,context})=>{
 // Synthetic PushEvent + captured display API. No FCM or physical delivery claim.
 await context.grantPermissions(['notifications']);await page.goto('/');await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.active);const worker=context.serviceWorkers()[0];expect(worker).toBeTruthy();await worker.evaluate(()=>{const target=self as unknown as {registration:ServiceWorkerRegistration;capturedNotice?:unknown};Object.defineProperty(target.registration,'showNotification',{value:(title:string,options:NotificationOptions)=>{target.capturedNotice={title,...options};return Promise.resolve();}});self.dispatchEvent(new PushEvent('push',{data:JSON.stringify({title:'PRIVATE CHILD NAME',body:'PRIVATE MEDICAL DETAILS',url:'https://evil.test',tag:'birge-ui-test'})}));});await expect.poll(()=>worker.evaluate(()=>(self as unknown as {capturedNotice:unknown}).capturedNotice)).toMatchObject({title:'Birge Bol',body:'В Birge Bol есть новое уведомление',tag:'birge-ui-test',data:{url:'/notifications'}});
});
