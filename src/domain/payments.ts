export function paymentDeadline(startsAt: string, now=Date.now()) {
    const start=Date.parse(startsAt), localDay=(time:number)=>new Date(time+5*3600000).toISOString().slice(0,10);
    const tomorrow=localDay(now+86400000);
    return new Date(localDay(start)<=tomorrow?Math.min(now+2*3600000,start):Math.min(now+86400000,start-6*3600000)).toISOString();
}
