document.addEventListener("DOMContentLoaded", function () {
  // Check the current active tab's URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];

      // If not on WhatsApp Web, redirect to it
      if (currentTab.url !== "https://web.whatsapp.com/") {
          chrome.tabs.update(currentTab.id, { url: "https://web.whatsapp.com/" });
      }

      // Add click event to download button after checking the URL
      document.getElementById("scrape-btn").addEventListener("click", () => {
          const selectedFormat = document.querySelector('input[name="format"]:checked').value;

          chrome.scripting.executeScript({
              target: { tabId: currentTab.id },
              function: runContactFinder,
              args: [selectedFormat],
          });
      });
  });
});

function runContactFinder(format) {
  const contactFinder = new ContactFinder();
  if (format === "json") {
    contactFinder.downloadMembersAsJSON();
  } else if (format === "csv") {
    contactFinder.downloadMembersAsCSV();
  } else {
    contactFinder.downloadMembersAsExcel();
  }
}
