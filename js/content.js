function addMembersToGroup(phoneNumbers) {
       // Ensure WhatsApp Web is open and the group is selected
       const inputBox = document.querySelector("div[contenteditable='true']");
       if (inputBox) {
         phoneNumbers.split(",").forEach((number) => {
           inputBox.textContent = number.trim();
           const event = new Event("input", { bubbles: true });
           inputBox.dispatchEvent(event);
           const addButton = document.querySelector("span[data-icon='add-member']");
           if (addButton) {
             addButton.click();
           }
         });
       }
     }

     // Listen for messages from the popup
     chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
       if (request.action === "addMembers") {
         addMembersToGroup(request.phoneNumbers);
         sendResponse({ success: true });
       }
     });
