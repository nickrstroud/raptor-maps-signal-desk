import { PLAY_OPTIONS, UPDATE_TYPE_OPTIONS } from "../lib/filters.ts";
import { PRODUCTS, VENDOR } from "../lib/vendor.ts";

// Vendor context shared by the account and industry prompts, built from lib/vendor.ts.
export const VENDOR_CONTEXT = `The vendor is ${VENDOR.name}, ${VENDOR.summary}. Products:
${PRODUCTS.map((p) => `- ${p.label} ("${p.value}"): ${p.description}`).join("\n")}

${VENDOR.csMotion}`;

export const PLAY_ENUM = PLAY_OPTIONS.map((p) => p.value);
export const UPDATE_TYPE_ENUM = UPDATE_TYPE_OPTIONS.map((t) => t.value);
export const PRODUCT_ENUM = PRODUCTS.map((p) => p.value);

export const TAXONOMY_TEXT = `updateType (pick exactly one):
${UPDATE_TYPE_OPTIONS.map((t) => `- "${t.value}" (${t.label})`).join("\n")}

play (the ${VENDOR.name} motion this points toward — pick exactly one; a product value
means expand or cross-sell that product):
${PLAY_OPTIONS.map((p) => `- "${p.value}" (${p.label})`).join("\n")}`;
