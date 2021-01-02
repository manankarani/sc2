var board = null
var game = new Chess()
var $status = $('#status')
var $pgn = $('#pgn')
var socket;
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

function onDragStart(source, piece, position, orientation) {
    // do not pick up pieces if the game is over
    if (game.game_over()) return false
    // only pick up pieces for White
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) || (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false
    }
}

function moveMove(bmove) {
    var possibleMoves = game.moves()
    // exit if the game is over
    if (game.game_over()) return
    game.move(bmove, {
        sloppy: true
    })
    board.position(game.fen())
    //window.setTimeout(moveMove, 3000)
    updateStatus()
}

function onDrop(source, target) {
    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    })
    // illegal move
    if (move === null) {
        return 'snapback'
    } else {
        socket.emit("mymove", {
            data: move.san
        });
    }
    // make random legal move for black
    //window.setTimeout(makeRandomMove, 250)
    updateStatus()
}
// update the board position after the piece snap
// for castling, en passant, pawn promotion
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

function onSnapEnd() {
    board.position(game.fen())
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
    onDragStart: onDragStart,
    onDrop: onDrop,
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare,
    onSnapEnd: onSnapEnd
}
board = Chessboard('myBoard', config)
$(document).ready(function () {
    //connect to the socket server.
    $(".play").click(function () {
        $(".board").css("visibility", "visible");
        $(".play").hide();
        $(".stop").css("visibility", "visible");
        $(".overlay").hide();
        socket = io.connect('http://' + document.domain + ':' + location.port + '/playcom');
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
            if (game.turn() == 'b') {
                moveMove(msg.bestmove);
            }
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