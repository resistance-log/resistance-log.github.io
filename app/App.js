Function.prototype.curry = function(){
    var fn = this;
    var args = Array.prototype.slice.call(arguments);
    return function(){
        return fn.apply(this, args.concat(Array.prototype.slice.call(arguments)));
    };
};

Array.prototype.minBy = function(propertyGetter){
    var array = this;
    if (!array.length)
        return undefined;
    var min = array[0];
    for(var i = 1; i < array.length; i++)
        if (propertyGetter(array[i]) < propertyGetter(min))
            min = array[i];
    return min;
}

var Bus = new function(){
    var subscribers = {};
    
    this.subscribe = function(eventName, callback){
        if (subscribers[eventName] === undefined)
            subscribers[eventName] = [];
        
        var callbacks = subscribers[eventName];
        callbacks.push(callback);
    }
    
    this.publish = function(eventName, eventValue){
        var callbacks = subscribers[eventName];
        if (!callbacks)
            return;
        
        for(var i = 0; i < callbacks.length; ++i){
            var callback = callbacks[i];
            callback(eventValue);
        }
    }
};

var PlayersState = new function(){
    var playersInfo = [];
    Bus.subscribe("PlayersConfigurationChanged", function(players){
        console.log(players);
        playersInfo = [];
        
    });
    this.get = function(playersCount){
        var seats = playersInfo[playersCount];
        var tableInfo = [];
        for(var i = 0; i < seats.length; ++i){
            var seat = seats[i];
            tableInfo.push({
                name: seat.name,
                selected: seat.selected
            });
        }
        return tableInfo;
    }
};

var PlayersConfiguration = {
    5: { playerCount: 5, spyCount: 2 },
    6: { playerCount: 6, spyCount: 2 },
    7: { playerCount: 7, spyCount: 3 },
    8: { playerCount: 8, spyCount: 3 },
    9: { playerCount: 9, spyCount: 4 },
    10: { playerCount: 10, spyCount: 4 },
}

var Table = React.createClass({
    getModes: function(){
        return ["Draw table", "Name players", "Log game"];
    },
    componentDidMount: function(){
        this.updateCanvas();
    },
    componentDidUpdate: function(){
        this.updateCanvas();
    },
    updateCanvas: function(){
        var seats = this.state.players[this.props.playersCount]
        var lastSeat = seats[seats.length - 1];
        
        var ctx = this.refs.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.props.width, this.props.height);
        ctx.lineWidth = this.props.width / 400;
        ctx.beginPath();
        ctx.moveTo(lastSeat.coords.x * this.props.width, lastSeat.coords.y * this.props.height);
        for(var i = 0; i < seats.length; ++i){
            var seat = seats[i];
            ctx.lineTo(seat.coords.x * this.props.width, seat.coords.y * this.props.height);
        }
        ctx.stroke();
        this.clearSelections();
    },
    createSeats(playersCount){
        var tableWidth = 0.3;
        
        var oddSeatPresent = playersCount % 2;
        var pairedSeats = (playersCount - oddSeatPresent) / 2;
        var columnCount = pairedSeats + oddSeatPresent;
        var columnStep = 1 / columnCount;
        
        var seats = [];
        var seatsOnOtherSide = [];
        for(var i = 0; i < pairedSeats; i++){
            var x = i * columnStep + (columnStep / 2);
            var y1 = 0.5 - tableWidth / 2;
            var y2 = 0.5 + tableWidth / 2;
            seats.push({
                coords: {
                    x: x,
                    y: y1
                },
                name: "Player" + (i * 2 + 1)
            });
            seatsOnOtherSide.push({
                coords: {
                    x: x,
                    y: y2
                },
                name: "Player" + (i * 2 + 2)
            });
        }
        if (oddSeatPresent){
            seats.push({
                coords: {
                    x: 1 - (columnStep / 2),
                    y: 0.5
                },
                name: "Player" + playersCount
            });
        }
        
        return seats.concat(seatsOnOtherSide.reverse());
    },
    getInitialState: function(){
        var players = [];
        for(var i = 5; i <= 10; i++){
            players[i] = this.createSeats(i);
        }
        return {
            players: players,
            mode: "Log game"
        };
    },
    onSeatMouseDown: function(i, event){
        var seat = this.state.players[this.props.playersCount][i];
        var dragging = {
            seatBeforeMove: {
                x: seat.coords.x,
                y: seat.coords.y
            },
            pxBeforeMove: {
                x: event.pageX,
                y: event.pageY
            },
            seatIndex: i
        }
        this.setState({
            dragging: dragging
        });
    },
    onSeatMouseMove: function(event){
        if (!this.state.dragging)
            return;
        var deltaX = event.pageX - this.state.dragging.pxBeforeMove.x;
        var deltaY = event.pageY - this.state.dragging.pxBeforeMove.y;
        
        var seat = this.state.players[this.props.playersCount][this.state.dragging.seatIndex];
        seat.coords.x = this.state.dragging.seatBeforeMove.x + deltaX / this.props.width;
        seat.coords.y = this.state.dragging.seatBeforeMove.y + deltaY / this.props.height;
        
        this.setState({
            players: this.state.players
        });
    },
    clearSelections: function(){
        if (window.getSelection){
            if (window.getSelection().empty){
                window.getSelection().empty();
            }
            else if (window.getSelection().removeAllRanges){
                window.getSelection().removeAllRanges();
            }
        }
        else if (document.selection){
            document.selection.empty();
        }
    },
    onSeatMouseUp: function(event){
        if (!this.state.dragging)
            return;
        
        var seats = this.state.players[this.props.playersCount];
        var dragging = this.state.dragging;
        var draggingSeat = seats[dragging.seatIndex];
        var dragBack = draggingSeat.coords.x < 0.05
            || draggingSeat.coords.x > 0.95
            || draggingSeat.coords.y < 0.05
            || draggingSeat.coords.y > 0.95;

        if (dragging.seatHovered !== undefined && dragging.seatHovered !== dragging.seatIndex){
            var draggingName = draggingSeat.name;
            draggingSeat.name = seats[dragging.seatHovered].name;
            seats[dragging.seatHovered].name = draggingName;
            dragBack = true;
        }
        
        if (dragBack){
            draggingSeat.coords.x = dragging.seatBeforeMove.x;
            draggingSeat.coords.y = dragging.seatBeforeMove.y;
        }
        
        this.setState({
            dragging: null
        });
    },
    onSeatNameChange: function(i, event){
        var seat = this.state.players[this.props.playersCount][i];
        seat.name = event.target.value;
        this.setState({
            players: this.state.players
        });
        Bus.publish("PlayersConfigurationChanged", this.state.players);
    },
    onSeatClick: function(i, event){
        var seat = this.state.players[this.props.playersCount][i];
        seat.selected = !seat.selected;
        this.setState({
            players: this.state.players
        });
        Bus.publish("PlayersConfigurationChanged", this.state.players);
    },
    onSeatMouseOver: function(i, event){
        if (!this.state.dragging)
            return;
        var dragging = this.state.dragging;
        dragging.seatHovered = i;
    },
    onModeButtonClick: function(mode){
        this.setState({
            mode: mode
        });
        if (mode === "Log game")
            return;
        var seats = this.state.players[this.props.playersCount];
        for(var i = 0; i < seats.length; ++i){
            seats[i].selected = false;
        }
        this.setState({
            players: this.state.players
        });
    },
    renderModeButtons: function(){
        var renderedButtons = [];
        var modes = this.getModes();
        
        var buttonStyle = {
            fontSize: this.props.width / 25,
            padding: this.props.width / 45
        }
        
        for(var i = 0; i < modes.length; ++i){
            var mode = modes[i];
            var disabled = this.state.mode === mode;
            renderedButtons.push(
                <button style={buttonStyle} key={i} disabled={disabled} onClick={this.onModeButtonClick.curry(mode)}>
                    {mode}
                </button>
            );
        }
        
        var buttonsContainerStyle = {
            display: "inline-block",
        }
        
        var centeringWrapperStyle = {
            textAlign: "center"
        }
        
        return (
            <div style={centeringWrapperStyle}>
                <div style={buttonsContainerStyle}>
                    {renderedButtons}
                </div>
            </div>
        )
    },
    renderSeats: function(){
        var seats = this.state.players[this.props.playersCount];
        var renderedSeats = [];
        for(var i = 0; i < seats.length; i++){
            var seat = seats[i];
            var seatWidth = this.props.width / 6;
            var seatHeight = this.props.width / 30;
            var fontSize = this.props.width / 40;
            
            var boxShadowColor = seat.selected
                ? "rgb(100, 170, 100)"
                : "rgb(100, 100, 170)";
            var boxShadowParam1 = this.props.width / 125;
            var boxShadowParam2 = this.props.width / 200;
            
            var seatStyle = {
                position: "absolute",
                left: this.props.width * seat.coords.x - seatWidth / 2 + "px",
                top: this.props.height * seat.coords.y - seatHeight / 2 + "px",
                width: seatWidth + "px",
                height: seatHeight + "px",
                backgroundColor: "white",
                borderRadius: "5px",
                boxShadow: boxShadowColor + " 0px 0px " + boxShadowParam1 + "px " + boxShadowParam2 + "px",
                textAlign: "center",
                fontSize: fontSize,
            };
            if (this.state.dragging && this.state.dragging.seatIndex === i){
                seatStyle.zIndex = -1;
            }
            
            if (this.state.mode === "Draw table"){
                renderedSeats.push(
                    <div 
                        style={seatStyle} 
                        onMouseDown={this.onSeatMouseDown.curry(i)}
                        onMouseOver={this.onSeatMouseOver.curry(i)}
                        key={i}>
                        {seat.name}
                    </div>
                );
            }
            if (this.state.mode === "Name players"){
                renderedSeats.push(
                    <input
                        style={seatStyle}
                        type="text"
                        key={i}
                        onChange={this.onSeatNameChange.curry(i)}
                        value={seat.name}>
                    </input>
                );
            }
            if (this.state.mode === "Log game"){
                renderedSeats.push(
                    <div 
                        style={seatStyle}
                        onClick={this.onSeatClick.curry(i)}
                        key={i}>
                        {seat.name}
                    </div>
                );
            }
        }
        
        return renderedSeats;
    },
    render: function(){
        var renderedSeats = this.renderSeats();
        var renderedButtons = this.renderModeButtons();
        
        var tableStyle = {
            position: "relative",
            width: this.props.width + "px",
            height: this.props.height + "px"
        };
        
        return (
            <div>
                {renderedButtons}
                <div style={tableStyle} onMouseMove={this.onSeatMouseMove} onMouseUp={this.onSeatMouseUp}>
                    <canvas ref="canvas" width={this.props.width} height={this.props.height}/>
                    {renderedSeats}
                </div>
            </div>
        )
    }
});

var GameLog = React.createClass({
    getInitialState: function(){
        return {
            judgements: [],
            log: []
        }
    },
    render: function(){
        var wrapperForColumns = {
            position: "relative"
        }
        var border = (this.props.width / 300) + "px solid black";
        var minHeight = (this.props.width / 3) + "px";
        var judgementsStyle = {
            position: "absolute",
            width: "50%",
            minHeight: minHeight,
            left: "0px",
            borderRight: border
        }
        var logStyle = {
            position: "absolute",
            width: "50%",
            minHeight: minHeight,
            right: "0px",
            borderLeft: border,
        }
        var headerStyle = {
            fontSize: this.props.width / 25,
            textAlign: "center"
        }
        return (
            <div>
                <div style={judgementsStyle}>
                    <div style={headerStyle}>Judgements</div>
                </div>
                <div style={logStyle}>
                    <div style={headerStyle}>Logs</div>
                </div>
            </div>
        )
    }
});

var Application = React.createClass({
    getRecommendedViewPortWidth: function(){
        return document.documentElement.clientWidth - 30;
    },
    getInitialState: function(){
        return {
            width: this.getRecommendedViewPortWidth()
        };
    },
    handleResize: function(){
        this.setState({
            width: this.getRecommendedViewPortWidth()
        });
    },
    componentDidMount: function(){
        window.addEventListener('resize', this.handleResize)
    },
    componentWillUnmount: function(){
        window.removeEventListener('resize', this.handleResize)
    },
    render: function(){
        var tableWrapperStyle = {
            width: this.state.width,
            margin: "0 auto"
        };
        var headerStyle = {
            textAlign: "center",
            fontSize: this.state.width / 15
        };
        return (
            <div>
                <div style={headerStyle}>
                    <span>Resistance Logger</span>
                </div>
                <div style={tableWrapperStyle}>
                    <Table playersCount={9} width={tableWrapperStyle.width} height={tableWrapperStyle.width / 2}/>
                </div>
                <GameLog playersCount={9} width={tableWrapperStyle.width}/>
            </div>
        )
    }
});

ReactDOM.render(
    <Application />,
    document.getElementById('application')
);