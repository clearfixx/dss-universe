/** DSS File Passport — diagnostic TCP guard for a deliberately unconfigured Worker process. */
import net from 'node:net';
import { writeFileSync } from 'node:fs';

let attempts = 0;
net.Socket.prototype.connect = function () {
  attempts += 1;
  throw new Error('DEBT029 diagnostic blocked a TCP connection');
};
process.on('exit', (code) => {
  writeFileSync(process.env.DSS_DIAGNOSTIC_REPORT, JSON.stringify({ code, attempts }));
});
