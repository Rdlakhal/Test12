document.addEventListener("DOMContentLoaded", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];

      if (currentTab.url !== "https://web.whatsapp.com/") {
          chrome.tabs.update(currentTab.id, { url: "https://web.whatsapp.com/" });
      }

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
