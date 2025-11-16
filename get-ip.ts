import os from 'os';

const interfaces = os.networkInterfaces();
console.log('Available network interfaces:');
Object.entries(interfaces).forEach(([name, ifaceGroup]) => {
    if (!ifaceGroup) return;
    console.log(`\n${name}:`);
    ifaceGroup.forEach(iface => {
        console.log(`  ${iface.family} ${iface.address} (internal: ${iface.internal})`);
    });
});