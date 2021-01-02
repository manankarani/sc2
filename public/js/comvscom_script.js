var board = null
var game = new Chess()
var $status = $('#status')
var $pgn = $('#pgn')
var whiteSquareGrey = '#B8C8DF'
var blackSquareGrey = '#5C789D98'

function removeGreySquares() {
    $('#myBoard .square-55d63').css('background', '')
}

function greySquare(square) {
    var $square = $('#myBoard .square-' + square)
    var background = whiteSquareGrey
    if ($square.hasClass('black-3c85d')) {
        background = blackSquareGrey
    }
    $square.css('background', background)
}

function moveMove(bmove) {
    var possibleMoves = game.moves()
    // exit if the game is over
    if (game.game_over()) return
    game.move(bmove, {
        sloppy: true
    })
    board.position(game.fen())
    window.setTimeout(moveMove, 500)
    updateStatus()
}
function onMouseoverSquare(square, piece) {
    // get list of possible moves for this square
    var moves = game.moves({
        square: square,
        verbose: true
    })
    // exit if there are no moves available for this square
    if (moves.length === 0) return
    // highlight the square they moused over
    greySquare(square)
    // highlight the possible squares for this piece
    for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to)
    }
}

function onMouseoutSquare(square, piece) {
    removeGreySquares()
}

function updateStatus() {
    var status = ''
    var moveColor = 'White'
    if (game.turn() === 'b') {
        moveColor = 'Black'
    } else {
        moveColor = 'White'
    }
    // checkmate?
    if (game.in_checkmate()) {
        status = 'Game over, ' + moveColor + ' is in checkmate.'
    }
    // draw?
    else if (game.in_draw()) {
        status = 'Game over, drawn position'
    }
    // game still on
    else {
        status = moveColor + ' to move'
        // check?
        if (game.in_check()) {
            status += ', ' + moveColor + ' is in check'
        }
    }
    $status.html(status)
    $pgn.html(game.pgn())
}
var config = {
    draggable: true,
    position: 'start',
}
board = Chessboard('myBoard', config)
$(document).ready(function () {
    //connect to the socket server.
    $(".play").click(function () {
        $(".board").css("visibility", "visible");
        $(".play").hide();
        $(".overlay").hide();
        $(".stop").css("visibility", "visible");
        var socket = io.connect('http://' + document.domain + ':' + location.port + '/comvscom');
        socket.emit('btn', {
            data: 'I\'m connected!'
        });
        var move_received = [];
        //receive details from server
        socket.on('move', function (msg) {
            console.log("Received move" + msg.bestmove);
            //maintain a list of ten move
            if (move_received.length >= 10) {
                move_received.shift()
            }
            move_received.push(msg.bestmove);
            moveMove(msg.bestmove);
        });
        $(window).on('unload', function () {
            socket.emit("stop", {
                data: 'I\'m reloaded'
            });
            board.position("start");
            game.reset();
        });
        $(".stop").click(function () {
            $(".board").css("visibility", "hidden");
            $(".play").fadeIn();
            $(".stop").css("visibility", "hidden");
            socket.emit("stop", {
                data: 'I\'m reseted'
            });
            board.position("start");
            game.reset();
        });
    });
});