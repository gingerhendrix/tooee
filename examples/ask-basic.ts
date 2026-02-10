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

import { launch } from "@tooee/ask"

// Launch the ask prompt with configuration
launch({
  // The prompt displayed above the input field
  prompt: "What's your name?",

  // Placeholder text shown when input is empty
  placeholder: "Enter your name...",

  // Optional default value (uncomment to use)
  // defaultValue: "Anonymous",

  // Actions define what happens on submit
  actions: [
    {
      id: "submit",
      title: "Submit",
      handler: (ctx) => {
        console.log(`Hello, ${ctx.ask.value}!`)
        ctx.exit()
      },
    },
  ],
})
