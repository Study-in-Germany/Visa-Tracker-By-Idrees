import test from "node:test";
import assert from "node:assert/strict";
import { COMMUNITY_LINKS } from "../lib/constants";
import {
  WHATSAPP_CHANNELS,
  WHATSAPP_COMMUNITIES,
  whatsappSupport,
  whatsappSupportUrl,
} from "../lib/whatsapp";

test("whatsappSupportUrl matches exact phone number and prefilled message", () => {
  assert.equal(whatsappSupport.phone, "923486587556");
  assert.equal(whatsappSupport.message, "Hi, I have a query.");
  assert.equal(
    whatsappSupportUrl,
    "https://wa.me/923486587556?text=Hi%2C%20I%20have%20a%20query."
  );
});

test("centralized WhatsApp channels and communities match all five required destinations", () => {
  assert.equal(WHATSAPP_CHANNELS.length, 2);
  assert.deepEqual(
    WHATSAPP_CHANNELS.map((c) => [c.title, c.ctaLabel, c.href]),
    [
      [
        "Study In Germany — Updates",
        "Follow channel",
        "https://whatsapp.com/channel/0029VbD6YAn4yltJDqNw773k",
      ],
      [
        "Learn German",
        "Follow channel",
        "https://whatsapp.com/channel/0029Vb9BeHeFsn0ielFdth2M",
      ],
    ]
  );

  assert.equal(WHATSAPP_COMMUNITIES.length, 3);
  assert.deepEqual(
    WHATSAPP_COMMUNITIES.map((g) => [g.title, g.ctaLabel, g.href]),
    [
      [
        "Study In Germany Community 1",
        "Join group",
        "https://chat.whatsapp.com/BZ6f2Yodozr3oNWTtqsR40",
      ],
      [
        "Study In Germany Community 2",
        "Join group",
        "https://chat.whatsapp.com/CqZMXiA1EpaBS0NLw2vFJO",
      ],
      [
        "Deutsch Mit Idrees Community",
        "Join group",
        "https://chat.whatsapp.com/DcF8N7CNLlgJ5g2Dmsq5qH",
      ],
    ]
  );

  assert.equal(COMMUNITY_LINKS.whatsappChannel, WHATSAPP_CHANNELS[0].href);
  assert.equal(COMMUNITY_LINKS.whatsappCommunity, WHATSAPP_COMMUNITIES[0].href);
});
