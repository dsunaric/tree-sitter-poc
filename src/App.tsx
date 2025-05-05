import React, {useCallback} from 'react';
import logo from './logo.svg';
import './App.css';

import * as fs from 'fs/promises';
import path from "node:path";

function App() {


  const testTreeSitter = useCallback(async () => {
    console.log("Generate diagram button was Pressed!");
    const response = await fetch("http://localhost:3001/read-java-files");
    const files = await response.json();
    console.log("files",files["NoMapping"]);
    console.log("Action dispatched: generate diagram");
  }, []);


  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          tree-sitter-poc
        </p>
        <button onClick={() => testTreeSitter()}>Try tree-sitter!</button>
      </header>
    </div>
  );
}

export default App;
