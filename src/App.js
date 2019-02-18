import React, { Component } from 'react';
import './App.css';
import Game from './game/Game';

class App extends Component {
  constructor() {
    super();
    this.gameDom = React.createRef();
  }

  componentDidMount() {
    this.game = new Game({ sceneWidth: window.innerWidth, sceneHeight: window.innerHeight });
    this.game.renderToDomElement(this.gameDom);
  }

  render() {
    return (
      <div className="game" ref={this.gameDom} />
    );
  }
}

export default App;
