const style = document.createElement("style");
style.textContent = `
  .notification {
    position: fixed;
    top: 20px;
    left: 20px;
    color: white;
    padding: 16px;
    border-radius: 4px;
    z-index: 100000;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
  }

  .notification.show {
    opacity: 1;
  }

  .notification.warning {
    background-color: #f44336; /* Red */
  }

  .notification.success {
    background-color: #4CAF50; /* Green */
  }
`;

document.head.appendChild(style);

const showNotification = (message, type = "success") => {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("show");
  }, 10);

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
};

class ContactFinder {
  #db;
  #chatToFind;
  #dbName = "model-storage";
  #chatsCol = "chat";
  #contactCol = "contact";
  #groupCol = "participant";
  #groupMetaData = "group-metadata";

  constructor() {
    this.#chatToFind = this.#getGroupName();
  }

  #getGroupName() {
    const groupNameNode = document.evaluate(
      "/html/body/div[1]/div/div/div[3]/div/div[4]/div/header/div[2]/div[1]/div/span/text()",
      document,
      null,
      XPathResult.STRING_TYPE,
      null
    );
    const groupName = groupNameNode.stringValue || "Unknown Group";
    console.log("Extracted Group Name:", groupName);
    return groupName;
  }

  async openConnection() {
    if (!this.#db) {
      const dbName = this.#dbName;
      this.#db = await new Promise((resolve, reject) => {
        let request = indexedDB.open(dbName);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.#chatsCol)) {
            db.createObjectStore(this.#chatsCol, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(this.#contactCol)) {
            db.createObjectStore(this.#contactCol, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(this.#groupCol)) {
            db.createObjectStore(this.#groupCol, { keyPath: "groupId" });
          }
          if (!db.objectStoreNames.contains(this.#groupMetaData)) {
            db.createObjectStore(this.#groupMetaData, { keyPath: "id" });
          }
        };

        request.onerror = (event) => {
          reject(event);
        };
        request.onsuccess = (event) => {
          resolve(event.target.result);
        };
      });
    }
    return this.#db;
  }

  async #promisifyCol(collection, query, count) {
    const db = await this.openConnection();
    return new Promise((resolve, reject) => {
      const request = db
        .transaction(collection)
        .objectStore(collection)
        .getAll(query, count);

      request.onerror = (event) => {
        reject(event);
      };
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
    });
  }

  async #getChats() {
    const allChats = await this.#promisifyCol(this.#chatsCol);
    const allGroupMetaData = await this.#promisifyCol(this.#groupMetaData);
    const chatToFind = this.#chatToFind;
    console.log("Full Group Meta Data:", allGroupMetaData);
    console.log("Full Chat Data:", allChats);
    console.log("Chat to Find:", chatToFind);

    return allGroupMetaData.filter((chat) => {
      return chat.subject && chat.subject.includes(chatToFind);
    });
  }

  async #getGroups() {
    const chats = (await this.#getChats()).map((chat) => chat.id);
    console.log("Filtered Chat IDs:", chats);
    const allGroups = await this.#promisifyCol(this.#groupCol);
    console.log("All Groups:", allGroups);
    return allGroups.filter((group) => {
      return group.groupId && chats.includes(group.groupId);
    });
  }

  async #getGroupParticipants() {
    const groups = await this.#getGroups();
    console.log("Filtered Groups:", groups);
    const map = new Map();

    groups.forEach((group) => {
      group.participants.forEach((par) => {
        const num = par.replace("@c.us", "");
        map.set(num, num);
      });
    });

    console.log("Group Participants Map:", map);
    return map;
  }

  async #getContacts() {
    return this.#promisifyCol(this.#contactCol);
  }

  async getGroupMembers() {
    const members = await this.#getGroupParticipants();
    const contacts = await this.#getContacts();
    console.log(contacts);
    console.log(members);

    contacts.forEach((contact) => {
      var num;
      if (contact.phoneNumber) {
        num = contact.phoneNumber.split("@")[0];
      } else if (contact.id) {
        num = contact.id.split("@")[0];
      }
      if (num && members.get(num)) {
        members.set(num, {
          phoneNum: num,
          name: contact.name,
          pushname: contact.pushname,
        });
      }
    });
    return members;
  }

  async downloadMembersAsJSON() {
    const members = await this.getGroupMembers();

    if (!members || members.size === 0) {
      showNotification(
        "The current group is not selected or the group is not accessible."
      );
      return;
    }

    let memberArray = [];

    for (const [key, value] of members.entries()) {
      const memberData = {
        phone: value.phoneNum || "",
        name: value.name || "",
        pushName: value.pushname || "",
        groupName: this.#chatToFind || "",
      };
      memberArray.push(memberData);
    }

    const jsonContent = JSON.stringify(memberArray, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const fileName = `${this.#chatToFind}.json`;

    var link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();

    showNotification("JSON download was successful.");
  }

  async downloadMembersAsCSV() {
    const members = await this.getGroupMembers();

    if (!members || members.size === 0) {
      showNotification(
        "The current group is not selected or the group is not accessible."
      );
      return;
    }

    let csvData = "Phone,Name,Push Name,Group Name\n";

    for (const [key, value] of members.entries()) {
      const row = [
        value.phoneNum || "",
        value.name || "",
        value.pushname || "",
        this.#chatToFind || "",
      ].join(",");
      csvData += row + "\n";
    }

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const fileName = `${this.#chatToFind}.csv`;

    var link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();

    showNotification("CSV download was successful.");
  }

  async downloadMembersAsExcel() {
    const members = await this.getGroupMembers();

    if (!members || members.size === 0) {
      showNotification(
        "The current group is not selected or the group is not accessible."
      );
      return;
    }

    let excelData = [];
    excelData.push(["Phone", "Name", "Push Name", "Group Name"]);

    for (const [key, value] of members.entries()) {
      const row = [
        value.phoneNum || "",
        value.name || "",
        value.pushname || "",
        this.#chatToFind || "",
      ];
      excelData.push(row);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, this.#chatToFind || "Group Data");

    const fileName = `${this.#chatToFind}.xlsx`;
    XLSX.writeFile(wb, fileName);

    showNotification("Excel download was successful.");
  }
}

const contactFinder = new ContactFinder();
