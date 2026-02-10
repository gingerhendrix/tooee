#!/usr/bin/env bun
/**
 * table-wide.ts - Demonstrates table auto-sizing with many columns
 *
 * This example shows:
 * - Wide tables with 10+ columns
 * - Columns with varying content widths (short to long)
 * - Auto-sizing algorithm handling truncation and proportional sizing
 *
 * Run: bun examples/table-wide.ts
 * Controls: j/k scroll rows, h/l scroll columns, q quit, t/T cycle themes
 */

import { launch, type ViewContentProvider, type ViewContent } from "@tooee/view"

const headers = [
  "Title",
  "Director",
  "Year",
  "Genre",
  "Rating",
  "Runtime",
  "Budget",
  "Box Office",
  "Country",
  "Language",
]

const rows = [
  ["The Shawshank Redemption", "Frank Darabont", "1994", "Drama", "9.3", "142 min", "$25M", "$58.3M", "USA", "English"],
  ["The Godfather", "Francis Ford Coppola", "1972", "Crime/Drama", "9.2", "175 min", "$6M", "$250M", "USA", "English/Italian"],
  ["The Dark Knight", "Christopher Nolan", "2008", "Action/Crime", "9.0", "152 min", "$185M", "$1.005B", "USA/UK", "English"],
  ["Pulp Fiction", "Quentin Tarantino", "1994", "Crime/Drama", "8.9", "154 min", "$8M", "$213.9M", "USA", "English/Spanish"],
  ["Schindler's List", "Steven Spielberg", "1993", "Biography/Drama", "9.0", "195 min", "$22M", "$322.2M", "USA", "English/Hebrew/German"],
  ["The Lord of the Rings: The Return of the King", "Peter Jackson", "2003", "Adventure/Fantasy", "9.0", "201 min", "$94M", "$1.146B", "NZ/USA", "English/Sindarin"],
  ["Forrest Gump", "Robert Zemeckis", "1994", "Drama/Romance", "8.8", "142 min", "$55M", "$678.2M", "USA", "English"],
  ["Inception", "Christopher Nolan", "2010", "Sci-Fi/Thriller", "8.8", "148 min", "$160M", "$836.8M", "USA/UK", "English/Japanese/French"],
  ["The Matrix", "The Wachowskis", "1999", "Sci-Fi/Action", "8.7", "136 min", "$63M", "$466.4M", "USA/Australia", "English"],
  ["Goodfellas", "Martin Scorsese", "1990", "Crime/Drama", "8.7", "146 min", "$25M", "$47M", "USA", "English/Italian"],
  ["Seven Samurai", "Akira Kurosawa", "1954", "Action/Drama", "8.6", "207 min", "$500K", "$2.3M", "Japan", "Japanese"],
  ["Parasite", "Bong Joon-ho", "2019", "Thriller/Drama", "8.5", "132 min", "$11.4M", "$263.1M", "South Korea", "Korean"],
  ["Interstellar", "Christopher Nolan", "2014", "Sci-Fi/Adventure", "8.7", "169 min", "$165M", "$773.4M", "USA/UK/Canada", "English"],
  ["City of God", "Fernando Meirelles", "2002", "Crime/Drama", "8.6", "130 min", "$3.3M", "$30.6M", "Brazil/France", "Portuguese"],
  ["Spirited Away", "Hayao Miyazaki", "2001", "Animation/Fantasy", "8.6", "125 min", "$19M", "$395.8M", "Japan", "Japanese"],
  ["The Silence of the Lambs", "Jonathan Demme", "1991", "Thriller/Horror", "8.6", "118 min", "$19M", "$272.7M", "USA", "English"],
  ["Eternal Sunshine of the Spotless Mind", "Michel Gondry", "2004", "Drama/Romance/Sci-Fi", "8.3", "108 min", "$20M", "$72.3M", "USA", "English"],
  ["Amélie", "Jean-Pierre Jeunet", "2001", "Comedy/Romance", "8.3", "122 min", "$10M", "$174.2M", "France/Germany", "French"],
  ["Princess Mononoke", "Hayao Miyazaki", "1997", "Animation/Fantasy", "8.4", "134 min", "$23.5M", "$169.5M", "Japan", "Japanese"],
  ["Whiplash", "Damien Chazelle", "2014", "Drama/Music", "8.5", "106 min", "$3.3M", "$49M", "USA", "English"],
]

// Serialize as TSV for the view body
const body = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n")

const contentProvider: ViewContentProvider = {
  load: (): ViewContent => ({
    title: "Movie Database",
    body,
    format: "table",
  }),
}

launch({ contentProvider })
