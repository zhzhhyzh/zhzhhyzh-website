// Capture visitor data and send to server
async function captureVisitorData() {
  try {
    // Get IP and region
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    const ip = data.ip;
    const region = data.region;
    const long = data.longitude;
    const lat = data.latitude;
    const tempLongLat = long + "," + lat;
    // Get current date and time
    const dateTime = new Date().toISOString();

    // Send data to server
    const captureResponse = await fetch('/capture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ip, region, dateTime, tempLongLat })
    });

    if (captureResponse.ok) {
      console.log('Visitor data captured successfully');
    } else {
      console.error('Failed to capture visitor data');
    }
  } catch (error) {
    console.error('Error capturing visitor data:', error);
  }
}

// Run on page load
window.addEventListener('load', captureVisitorData);
