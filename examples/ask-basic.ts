#!/usr/bin/env bun
/**
 * ask-basic.ts - Demonstrates @tooee/ask for gathering user input
 *
 * This example shows:
 * - Prompting the user with a question
 * - Using placeholder text and default values
 * - Handling the submitted value via a submit action
 * - Output goes to stdout for shell scripting
 *
 * Run: bun examples/ask-basic.ts
 * Controls: Type input, Enter to submit, Escape to cancel
 */

import { launch } from "@tooee/ask";

// Launch the ask prompt with configuration
await launch({
  // Actions define what happens on submit
  actions: [
    {
      handler: (ctx) => {
        ctx.exit();
      },
      id: "submit",
      title: "Submit",
    },
  ],

  // Placeholder text shown when input is empty
  placeholder: "Enter your name...",

  // The prompt displayed above the input field
  prompt: "What's your name?",
  title: "Ask Example",

  // Optional default value (uncomment to use)
  // defaultValue: "Anonymous",
});
