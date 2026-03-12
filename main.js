const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    function toSeconds(timeStr) {
        let parts = timeStr.trim().split(" ");
        let timePart = parts[0];
        let ampm = parts[1];

        let timePieces = timePart.split(":");
        let hours = Number(timePieces[0]);
        let minutes = Number(timePieces[1]);
        let seconds = Number(timePieces[2]);

        if (ampm === "pm" && hours !== 12) {
            hours += 12;
        }

        if (ampm === "am" && hours === 12) {
            hours = 0;
        }

        return hours * 3600 + minutes * 60 + seconds;
    }

    let startSeconds = toSeconds(startTime);
    let endSeconds = toSeconds(endTime);
    let diff = endSeconds - startSeconds;

    let hours = Math.floor(diff / 3600);
    let minutes = Math.floor((diff % 3600) / 60);
    let seconds = diff % 60;

    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {

    function convert(timeStr) {
        let [clock, period] = timeStr.trim().split(" ");
        let [h, m, s] = clock.split(":").map(Number);

        if (period === "pm" && h !== 12) h += 12;
        if (period === "am" && h === 12) h = 0;

        return h * 3600 + m * 60 + s;
    }

    let start = convert(startTime);
    let end = convert(endTime);

    let workStart = 8 * 3600;
    let workEnd = 22 * 3600;

    let idle = 0;

    if (start < workStart) {
        idle += workStart - start;
    }

    if (end > workEnd) {
        idle += end - workEnd;
    }

    let hours = Math.floor(idle / 3600);
    let minutes = Math.floor((idle % 3600) / 60);
    let seconds = idle % 60;

    return `${hours}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {

    function toSeconds(timeStr) {
        let [h, m, s] = timeStr.split(":").map(Number);
        return h * 3600 + m * 60 + s;
    }

    let shiftSec = toSeconds(shiftDuration);
    let idleSec = toSeconds(idleTime);

    let active = shiftSec - idleSec;

    let hours = Math.floor(active / 3600);
    let minutes = Math.floor((active % 3600) / 60);
    let seconds = active % 60;

    return `${hours}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {

    function toSeconds(timeStr) {
        let [h, m, s] = timeStr.split(":").map(Number);
        return h * 3600 + m * 60 + s;
    }

    let activeSeconds = toSeconds(activeTime);

    let normalQuota = toSeconds("8:24:00");
    let eidQuota = toSeconds("6:00:00");

    let currentDate = new Date(date);
    let eidStart = new Date("2025-04-10");
    let eidEnd = new Date("2025-04-30");

    if (currentDate >= eidStart && currentDate <= eidEnd) {
        return activeSeconds >= eidQuota;
    } else {
        return activeSeconds >= normalQuota;
    }
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    const fs = require("fs");

    let content = fs.readFileSync(textFile, "utf8").trim();
    let lines = content === "" ? [] : content.split("\n");

    let records = lines.map(line => line.split(",").map(x => x.trim()));

    for (let r of records) {
        if (r[0] === shiftObj.driverID && r[2] === shiftObj.date) {
            return {};
        }
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quotaMet = metQuota(shiftObj.date, activeTime);

    let newRecord = [
        shiftObj.driverID,
        shiftObj.driverName,
        shiftObj.date,
        shiftObj.startTime,
        shiftObj.endTime,
        shiftDuration,
        idleTime,
        activeTime,
        quotaMet,
        false
    ];

    let insertIndex = -1;

    for (let i = 0; i < records.length; i++) {
        if (records[i][0] === shiftObj.driverID) {
            insertIndex = i;
        }
    }

    if (insertIndex === -1) {
        records.push(newRecord);
    } else {
        records.splice(insertIndex + 1, 0, newRecord);
    }

    let newContent = records.map(r => r.join(",")).join("\n");
    fs.writeFileSync(textFile, newContent);

    return {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: quotaMet,
        hasBonus: false
    };
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    const fs = require("fs");

    let content = fs.readFileSync(textFile, "utf8").trim();
    let lines = content === "" ? [] : content.split("\n");

    let updated = lines.map(line => {
        let parts = line.split(",").map(x => x.trim());

        if (parts[0] === driverID && parts[2] === date) {
            parts[9] = String(newValue);
        }

        return parts.join(",");
    });

    fs.writeFileSync(textFile, updated.join("\n"));
}
// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    const fs = require("fs");

    let content = fs.readFileSync(textFile, "utf8").trim();
    let lines = content === "" ? [] : content.split("\n");

    let targetMonth = String(Number(month));
    let count = 0;
    let foundDriver = false;

    for (let line of lines) {
        let parts = line.split(",").map(x => x.trim());

        let currentDriver = parts[0];
        let date = parts[2];
        let bonus = parts[9] === "true";

        let sep = date.includes("-") ? "-" : "/";
        let dateParts = date.split(sep);

        let recordMonth = String(Number(dateParts[1]));

        if (currentDriver === driverID) {
            foundDriver = true;

            if (recordMonth === targetMonth && bonus) {
                count++;
            }
        }
    }

    if (!foundDriver) {
        return -1;
    }

    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    const fs = require("fs");

    let content = fs.readFileSync(textFile, "utf8").trim();
    let lines = content === "" ? [] : content.split("\n");

    let targetMonth = String(Number(month));
    let totalSeconds = 0;

    for (let line of lines) {
        let parts = line.split(",").map(x => x.trim());

        let currentDriver = parts[0];
        let date = parts[2];
        let active = parts[7];

        let sep = date.includes("-") ? "-" : "/";
        let dateParts = date.split(sep);

        let recordMonth = String(Number(dateParts[1]));

        if (currentDriver === driverID && recordMonth === targetMonth) {

            let [h, m, s] = active.split(":").map(Number);
            totalSeconds += h * 3600 + m * 60 + s;
        }
    }

    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;

    return `${hours}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    const fs = require("fs");

    let shiftData = fs.readFileSync(textFile, "utf8").trim().split("\n");
    let rateData = fs.readFileSync(rateFile, "utf8").trim().split("\n");

    let targetMonth = String(Number(month));
    let dayOff = "";

    for (let line of rateData) {
        let parts = line.split(",").map(x => x.trim());

        if (parts[0] === driverID) {
            dayOff = parts[1];
            break;
        }
    }

    let totalSeconds = 0;

    for (let line of shiftData) {
        let parts = line.split(",").map(x => x.trim());

        let currentDriver = parts[0];
        let date = parts[2];

        if (currentDriver !== driverID) continue;

        let sep = date.includes("-") ? "-" : "/";
        let d = date.split(sep);

        let year = Number(d[0]);
        let m = String(Number(d[1]));
        let day = Number(d[2]);

        if (m !== targetMonth) continue;

        let currentDate = new Date(year, Number(m) - 1, day);
        let weekday = currentDate.toLocaleDateString("en-US", { weekday: "long" });

        if (weekday.toLowerCase() === dayOff.toLowerCase()) continue;

        let eidStart = new Date(2025,3,10);
        let eidEnd = new Date(2025,3,30);

        if (currentDate >= eidStart && currentDate <= eidEnd) {
            totalSeconds += 6 * 3600;
        } else {
            totalSeconds += (8 * 3600) + (24 * 60);
        }
    }

    totalSeconds -= bonusCount * 2 * 3600;

    if (totalSeconds < 0) totalSeconds = 0;

    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;

    return `${hours}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    const fs = require("fs");

    function toSeconds(t) {
        let [h,m,s] = t.split(":").map(Number);
        return h*3600 + m*60 + s;
    }

    let rateData = fs.readFileSync(rateFile,"utf8").trim().split("\n");

    let basePay = 0;
    let tier = 0;

    for (let line of rateData) {
        let parts = line.split(",").map(x=>x.trim());

        if (parts[0] === driverID) {
            basePay = Number(parts[2]);
            tier = Number(parts[3]);
            break;
        }
    }

    let actualSec = toSeconds(actualHours);
    let requiredSec = toSeconds(requiredHours);

    if (actualSec >= requiredSec) {
        return basePay;
    }

    let missingHours = Math.floor((requiredSec - actualSec) / 3600);

    let allowed = 0;

    if (tier === 1) allowed = 50;
    else if (tier === 2) allowed = 20;
    else if (tier === 3) allowed = 10;
    else if (tier === 4) allowed = 3;

    let deductedHours = missingHours - allowed;

    if (deductedHours < 0) deductedHours = 0;

    let deductionPerHour = Math.floor(basePay / 185);
    let totalDeduction = deductedHours * deductionPerHour;

    return basePay - totalDeduction;
}
module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
