class ContactFinder {
  #db;
  #chatToFind;
  #dbName = "model-storage";
  #chatsCol = "chat";
  #contactCol = "contact";
  #groupCol = "participant";

  constructor() {
    this.#chatToFind = this.#getGroupName();
  }

  #getGroupName() {
    const groupNameNode = document.evaluate(
      "/html/body/div[1]/div/div/div[2]/div[4]/div/header/div[2]/div[1]/div/span/text()",
      document,
      null,
      XPathResult.STRING_TYPE,
      null
    );
    return groupNameNode.stringValue || "Unknown Group";
  }

  async openConnection() {
    if (!this.#db) {
      const dbName = this.#dbName;
      this.#db = await new Promise((resolve, reject) => {
        let request = indexedDB.open(dbName);
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
    const chatToFind = this.#chatToFind;
    return allChats.filter((chat) => {
      return chat.name && chat.name.includes(chatToFind);
    });
  }

  async #getGroups() {
    const chats = (await this.#getChats()).map((chat) => chat.id);
    const allGroups = await this.#promisifyCol(this.#groupCol);
    return allGroups.filter((group) => {
      return group.groupId && chats.includes(group.groupId);
    });
  }

  async #getGroupParticipants() {
    const groups = await this.#getGroups();
    const map = new Map();

    groups.forEach((group) => {
      group.participants.forEach((par) => {
        const num = par.replace("@c.us", "");
        map.set(num, num);
      });
    });

    return map;
  }

  async #getContacts() {
    return this.#promisifyCol(this.#contactCol);
  }

  async getGroupMembers() {
    const members = await this.#getGroupParticipants();
    const contacts = await this.#getContacts();

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
      alert("The current group is not selected or the group is not accessible.");
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
  }

  async downloadMembersAsCSV() {
    const members = await this.getGroupMembers();
  
    if (!members || members.size === 0) {
      alert("The current group is not selected or the group is not accessible.");
      return;
    }
  
    let csvData = "Phone,Name,Push Name,Group Name\n"; // CSV header
  
    for (const [key, value] of members.entries()) {
      const row = [
        value.phoneNum || "",
        value.name || "",
        value.pushname || "",
        this.#chatToFind || "",
      ].join(","); // Join row data
      csvData += row + "\n"; // Add row to CSV data
    }
  
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const fileName = `${this.#chatToFind}.csv`;
  
    var link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
  }

  async downloadMembersAsExcel() {
    const members = await this.getGroupMembers();
  
    if (!members || members.size === 0) {
      alert("The current group is not selected or the group is not accessible.");
      return;
    }
  
    let excelData = [];
    excelData.push(["Phone", "Name", "Push Name", "Group Name"]); // Excel header
  
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
  }
}

// Execute the script
const contactFinder = new ContactFinder();
