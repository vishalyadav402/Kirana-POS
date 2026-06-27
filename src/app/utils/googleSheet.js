const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbwp4frgUZ0yg0MpLHZj9o7ceKvgv5vUxMXdhNjscSEkDL9bc1yc93Wy4KDWmuk0S3UmJg/exec";

// ✅ Optimized single item sync
export const syncSingleItem = async (type, item) => {
  try {
    await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({
        type,
        payload: [item],
      }),
    });
  } catch (error) {
    console.error("Sync failed", error);
  }
};

// ✅ Restore data
export const fetchFromGoogleSheet = async (type) => {
  try {
    const res = await fetch(`${SHEET_API_URL}?type=${type}`);
    return await res.json();
  } catch (err) {
    console.error("Fetch failed", err);
    return [];
  }
};