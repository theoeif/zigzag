/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", // Adjust if necessary
    "./App.jsx",
    "./main.jsx",
    "./components/**/*.{js,jsx}", // Include all components in the folder
    "./src/**/*.{js,jsx,ts,tsx}", // Include all components and files in your src directory
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
