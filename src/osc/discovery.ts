import { Bonjour } from "bonjour-service";

export interface DiscoveredQLab {
  name: string;
  host: string;
  port: number;
  txt: Record<string, string>;
}

export function discoverQLab(timeoutMs = 3000): Promise<DiscoveredQLab[]> {
  return new Promise((resolve) => {
    const bonjour = new Bonjour();
    const found: DiscoveredQLab[] = [];

    const browser = bonjour.find({ type: "qlab", protocol: "tcp" }, (svc) => {
      const host = svc.addresses?.[0] ?? svc.host;
      found.push({
        name: svc.name,
        host,
        port: svc.port,
        txt: (svc.txt as Record<string, string>) ?? {},
      });
    });

    setTimeout(() => {
      browser.stop();
      bonjour.destroy();
      resolve(found);
    }, timeoutMs);
  });
}
