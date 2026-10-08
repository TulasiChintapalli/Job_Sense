import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles.css";
class Boundary extends React.Component {
  state = { e: false };
  static getDerivedStateFromError() { return { e: true }; }
  render() { return this.state.e ? <div className="center"><h2>Something went wrong.</h2><button className="btn" onClick={() => location.assign("/")}>Reload</button></div> : this.props.children; }
}
createRoot(document.getElementById("root")).render(<Boundary><BrowserRouter><App /></BrowserRouter></Boundary>);
