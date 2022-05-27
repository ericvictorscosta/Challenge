const fs = require("fs");
const csv = require("csvtojson");
const { PhoneNumberUtil } = require("google-libphonenumber");
const phoneUtil = PhoneNumberUtil.getInstance();
const csvFilePath = fs.readFileSync("./input.csv", { encoding: "utf8" });

function parseBoolean(value) {
  return ["1", "yes"].includes(value.trim());
}
function isPhoneAddress(value) {
  try {
    return phoneUtil.isValidNumberForRegion(phoneUtil.parse(value, "BR"), "BR");
  } catch {
    return false;
  }
}
function isEmailAddress(value) {
  return /[a-z0-9]+@[a-z]+\.[a-z]{2,3}/.test(value);
}
/**
 *
 * @param {Array} row
 * @param {Array} columns : ;
 * @returns
 */
function ParseRow(row, columns) {
  const fullnameIndex = columns.indexOf("fullname");
  const eidIndex = columns.indexOf("eid");
  const groupIndexes = columns
    .map((column, index) => column === "group" && index)
    .filter((index) => index !== false);

  const addresses = columns
    .map(
      (column, index) =>
        /^(phone|email)/.test(column) && [
          index,
          ...column.split(" ").map((data) => data.trim()),
        ]
    )
    .filter((index) => index !== false);

  const invisibleIndex = columns.indexOf("invisible");
  const seeAllIndex = columns.indexOf("see_all");

  return {
    fullname: row[fullnameIndex],
    eid: row[eidIndex],
    groups: groupIndexes
      .map((i) => row[i])
      .flatMap((data) => data.split(/\/|,/).map((data) => data.trim()))
      .filter(Boolean),
    addresses: addresses
      .flatMap(([index, type, ...tags]) => {
        const address = row[index];
        if (type === "phone" && isPhoneAddress(address)) {
          return { type, tags, address: "55" + address.replace(/\D/g, "") };
        }
        if (type === "email") {
          return address
            .split(/\/|,| /)
            .filter(isEmailAddress)
            .map((address) => ({
              type,
              tags,
              address,
            }));
        }
        return;
      })
      .filter(Boolean),
    invisible: parseBoolean(row[invisibleIndex]),
    see_all: parseBoolean(row[seeAllIndex]),
  };
}
async function Main() {
  const csvData = await csv({
    noheader: true,
    output: "csv",
  }).fromString(csvFilePath);

  const [columns, ...rows] = csvData;
  fs.writeFileSync(
    "./output.json",
    JSON.stringify(
      rows
        .map((row) => ParseRow(row, columns))
        .reduce((rows, object) => {
          let index = rows.findIndex(({ eid }) => eid === object.eid);
          if (index !== -1) {
            rows[index].addresses = [
              ...rows[index].addresses,
              ...object.addresses,
            ].sort();
            rows[index].groups = [
              ...new Set([...rows[index].groups, ...object.groups]).values(),
            ].sort();
          } else {
            rows.push(object);
          }
          return rows;
        }, []),
      null,
      2
    )
  );
}
Main();
