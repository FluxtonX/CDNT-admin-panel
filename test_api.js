const fetch = require('node-fetch');

async function run() {
  const res = await fetch('http://localhost:3001/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platformName: "Test Name",
      supportEmail: "test@test.com",
      maintenanceMode: "false",
      platformFee: "1.0",
      maxWithdrawal: "1000",
      minWithdrawal: "10",
      autoApprove: "false",
      requireKyc: "true",
      require2fa: "true",
      emailNotifications: "true",
      smsNotifications: "false"
    })
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

run();
