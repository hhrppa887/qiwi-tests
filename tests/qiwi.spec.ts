import { test, expect } from "@playwright/test";

const BASE_URL = "https://edge.qiwi.com";
const PHONE = "79991234567"; // номер кошелька
const PROVIDER_CODE = "bank-card-russia";
const RECIPIENT_ACCOUNT = "79123456789";

let paymentId: string;

test("Доступность сервиса (получение платежей)", async ({ request }) => {
  const res = await request.get(`${BASE_URL}/payment-history/v2/persons/${PHONE}/payments`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty("data");
});

test("Баланс больше 0", async ({ request }) => {
  const res = await request.get(`${BASE_URL}/funding-sources/v2/persons/${PHONE}/accounts`);
  expect(res.status()).toBe(200);

  const body = await res.json();
  const balance = parseFloat(body.balance.value);
  expect(balance).toBeGreaterThan(0);
});

test("Создание платежа на 1 рубль", async ({ request }) => {
  const res = await request.post(`${BASE_URL}/sinap/api/v2/terms/${PROVIDER_CODE}/payments`, {
    data: {
      recipientDetails: {
        providerCode: PROVIDER_CODE,
        fields: { pan: "123456******4321" }
      },
      amount: {
        value: "1.00",
        currency: "RUB"
      },
      source: {
        paymentType: "NO_EXTRA_CHARGE",
        paymentToolType: "BANK_ACCOUNT",
        paymentTerminalType: "INTERNET_BANKING"
      }
    }
  });

  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(body.amount.value).toBe("1.00");
  expect(body.amount.currency).toBe("RUB");

  paymentId = body.paymentId;
});

test("Исполнение платежа", async ({ request }) => {
  const res = await request.post(`${BASE_URL}/execute`, {
    data: {
      paymentId: paymentId,
      creationDateTime: new Date().toISOString(),
      expirationDatetime: new Date().toISOString(),
      status: {
        value: "IN_PROGRESS",
        changedDateTime: new Date().toISOString()
      },
      recipientDetails: {
        providerCode: "qiwi-wallet",
        fields: { account: RECIPIENT_ACCOUNT }
      },
      amount: {
        value: "1.00",
        currency: "RUB"
      }
    }
  });

  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(body.paymentId).toBe(paymentId);
  expect(["IN_PROGRESS", "SUCCESS", "FAILED"]).toContain(body.status.value);
});
