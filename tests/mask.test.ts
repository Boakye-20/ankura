import { describe, expect, it } from "vitest";
import complaints from "../data/complaints.json";
import names from "../data/names.json";
import merchants from "../data/merchants.json";
import { findLeaks, maskComplaint } from "../lib/mask";
import type { Complaint } from "../lib/types";

const lists = { names: ["Ada Quill", "Bram Quill", "Cora Lind"], merchants: ["Northbay Electronics"] };
const customer = { name: "Ada Quill" };
const mask = (text: string, notes: string[] = [], cust: Complaint["customer"] = customer) =>
  maskComplaint({ customer: cust, text, caseNotes: notes.map((t, i) => ({ id: `N-${i + 1}`, date: "2026-11-01", author: "JO", text: t })) }, lists);

describe("maskComplaint: each data type", () => {
  it.each([
    ["customer full name", "Signed, Ada Quill.", "[CUSTOMER_1]"],
    ["customer name in lower case", "signed ada quill", "[CUSTOMER_1]"],
    ["customer first name alone", "Ada here again.", "[CUSTOMER_1]"],
    ["title and surname", "Dear Mrs Quill, thanks", "[CUSTOMER_1]"],
    ["other listed person", "My friend Cora Lind helped.", "[PERSON_1]"],
    ["relative by first name", "My husband Bram passed away.", "[PERSON_1]"],
    ["account number", "account 9900112345 please", "[ACCOUNT_1]"],
    ["account number spaced 4+4", "account 9900 1234 please", "[ACCOUNT_1]"],
    ["account number split over a line", "number is 9900-1234\n5678 ok", "[ACCOUNT_1]"],
    ["sort code with dashes", "sort code 99-04-17.", "[SORTCODE_1]"],
    ["sort code with no separators", "sort code 990417.", "[SORTCODE_1]"],
    ["card number", "card 9999 1234 5678 9012 was used", "[CARD_1]"],
    ["card ending", "my card ending 4821 was used", "[CARD_1]"],
    ["email", "email ada.quill@example.com now", "[EMAIL_1]"],
    ["mobile", "call 07700 900211 today", "[PHONE_1]"],
    ["landline", "call 0113 496 0217 today", "[PHONE_1]"],
    ["postcode", "I live at LS1 4AB.", "[POSTCODE_1]"],
    ["merchant", "paid to northbay electronics twice", "[MERCHANT_1]"],
    ["number words", "sort code is nine nine, one two, three four", "[NUMBER_1]"],
  ])("%s", (_, text, token) => {
    expect(mask(text).maskedText).toContain(token);
  });

  it("keeps money amounts and dates", () => {
    const { maskedText } = mask("On 12 October 2026 £412.00 and £1,389.50 were taken; also on 15/09.");
    expect(maskedText).toBe("On 12 October 2026 £412.00 and £1,389.50 were taken; also on 15/09.");
  });

  it("does not mask internal references", () => {
    expect(mask("Incident log ref BRN-2026-0918.").maskedText).toBe("Incident log ref BRN-2026-0918.");
  });
});

describe("maskComplaint: consistency", () => {
  it("gives a repeated value the same token", () => {
    const r = mask("Ada Quill rang from 07700 900211. Ada said 07700900211 is her number.");
    expect(r.maskedText).toBe("[CUSTOMER_1] rang from [PHONE_1]. [CUSTOMER_1] said [PHONE_1] is her number.");
    expect(r.counts).toEqual({ PHONE: 1, CUSTOMER: 1 });
  });

  it("uses the same token in the complaint and the case notes", () => {
    const r = mask("My husband Bram died.", ["Husband Bram Quill deceased. JO"]);
    expect(r.maskedText).toBe("My husband [PERSON_1] died.");
    expect(r.maskedNotes[0].text).toBe("Husband [PERSON_1] deceased. JO");
  });

  it("leaves staff initials in notes unmasked", () => {
    expect(mask("x", ["Cust called. JO"]).maskedNotes[0].text).toBe("Cust called. JO");
  });

  it("keeps real values only in the token map", () => {
    const r = mask("Ada Quill, 9900112345");
    expect(Object.values(r.tokenMap).sort()).toEqual(["9900112345", "Ada Quill"]);
  });

  it("counts number-word runs", () => {
    expect(mask("it is nine nine, one two, three four").obfuscatedRuns).toBe(1);
    expect(mask("I called one or two times").obfuscatedRuns).toBe(0);
  });
});

describe("findLeaks", () => {
  it("catches a missed customer name", () => {
    expect(findLeaks("Thanks, Ada Quill", customer, lists)).toContain("customer name");
  });

  it("catches a customer number with different spacing", () => {
    expect(findLeaks("number 9900 112 345", { name: "Ada Quill", account: "9900112345" }, lists)).toContain("customer account");
  });

  it("catches a missed listed name and never returns the value itself", () => {
    const leaks = findLeaks("Cora Lind called", customer, lists);
    expect(leaks).toEqual(["listed person name"]);
  });

  it("is empty for fully masked text", () => {
    expect(findLeaks("[CUSTOMER_1] called from [PHONE_1]", { name: "Ada Quill", phone: "07700 900211" }, lists)).toEqual([]);
  });
});

describe("maskComplaint over the synthetic dataset", () => {
  it("leaves no customer value, listed name or merchant in any of the 60 cases", () => {
    for (const c of complaints as Complaint[]) {
      expect({ ref: c.ref, leaks: maskComplaint(c, { names, merchants }).leaks }).toEqual({ ref: c.ref, leaks: [] });
    }
  });
});
