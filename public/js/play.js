var board = null;
var game = new Chess();
var $status = $("#status");
var $pgn = $("#pgn");
var whiteSquareGrey = "#B8C8DF";
var blackSquareGrey = "#5C789D98";
var socket = io("http://localhost:3000", { transport: ["websocket"] });
//var socket = io.connect('http://localhost:8080');
//var socket = io("http://1145a63b6e04.ngrok.io", { transport: ["websocket"] });
var orientation_flag = false;
socket.on("connect", function () {
  //    Connected, let's sign-up for to receive messages for this room
  socket.on("newroom", function (data) {
    console.log(data);
    room = data.room;
    id_b = data.id;
  });
  socket.emit("room");
  socket.on("message", function (data) {
    console.log("Incoming message:", data);
  });
  socket.on("wait", function (data) {
    console.log("waiting");
    $(".row").css("visibility", "hidden");
    board.flip();
  });

  socket.on("play", function (data) {
    id_w = data.id;
    room = data.room;
    console.log(data);
    console.log("Start Play");
    $(".loading-container").hide();
    $(".row").css("visibility", "visible");
  });
});

function removeGreySquares() {
  $("#myBoard .square-55d63").css("background", "");
}

function greySquare(square) {
  var $square = $("#myBoard .square-" + square);
  var background = whiteSquareGrey;
  if ($square.hasClass("black-3c85d")) {
    background = blackSquareGrey;
  }
  $square.css("background", background);
}

function onDragStart(source, piece, position, orientation) {
  // do not pick up pieces if the game is over
  if (game.game_over()) return false;
  // only pick up pieces for White
  console.log("orientation flag:" + board.orientation());
  if (board.orientation() === "white") {
    if (piece.search(/^b/) !== -1) {
      return false;
    }
  } else {
    if (piece.search(/^w/) !== -1) {
      return false;
    }
  }
  // FOR DEBUGGING
  /*
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false
    
    // DEBUGGING END
  }*/
}

function moveMove(bmove) {
  var possibleMoves = game.moves();
  // exit if the game is over
  if (game.game_over()) return;
  game.move(bmove, {
    sloppy: true,
  });
  board.position(game.fen());
  //window.setTimeout(moveMove, 3000)
  updateStatus();
}

function onDrop(source, target) {
  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: "q", // NOTE: always promote to a queen for example simplicity
  });
  // illegal move
  if (move === null) {
    return "snapback";
  } else {
    if (board.orientation() === "white") {
      socket.emit("mymove", {
        move: move.san,
        id: id_w,
        room: room,
      });
    } else {
      socket.emit("mymove", {
        move: move.san,
        id: id_b,
        room: room,
      });
    }
  }
  // make random legal move for black
  //window.setTimeout(makeRandomMove, 250)
  updateStatus();
}
// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onMouseoverSquare(square, piece) {
  // get list of possible moves for this square
  var moves = game.moves({
    square: square,
    verbose: true,
  });
  // exit if there are no moves available for this square
  if (moves.length === 0) return;
  // highlight the square they moused over
  greySquare(square);
  // highlight the possible squares for this piece
  for (var i = 0; i < moves.length; i++) {
    greySquare(moves[i].to);
  }
}

function onMouseoutSquare(square, piece) {
  removeGreySquares();
}

function onSnapEnd() {
  board.position(game.fen());
}

function updateStatus() {
  var status = "";
  var moveColor = "White";
  if (game.turn() === "b") {
    moveColor = "Black";
  } else {
    moveColor = "White";
  }
  // checkmate?
  if (game.in_checkmate()) {
    status = "Game over, " + moveColor + " is in checkmate.";
  }
  // draw?
  else if (game.in_draw()) {
    status = "Game over, drawn position";
  }
  // game still on
  else {
    status = moveColor + " to move";
    // check?
    if (game.in_check()) {
      status += ", " + moveColor + " is in check";
    }
  }
  $status.html(status);
  $pgn.html(game.pgn());
}
var config = {
  draggable: true,
  position: "start",
  onDragStart: onDragStart,
  onDrop: onDrop,
  onMouseoutSquare: onMouseoutSquare,
  onMouseoverSquare: onMouseoverSquare,
  onSnapEnd: onSnapEnd,
};
board = Chessboard("myBoard", config);
$(document).ready(function () {
  //connect to the socket server.
  $(".play").click(function () {
    $(".board").css("visibility", "visible");
    $(".play").hide();
    $(".stop").css("visibility", "visible");
    $(".overlay").hide();
    socket.emit("btn", {
      data: "I'm connected!",
    });
    //receive details from server
    socket.on("your_move", function (msg) {
      console.log(msg);
      console.log("Received move" + msg.their_move);
      //maintain a list of ten move
      moveMove(msg.their_move);
    });
    $(window).on("unload", function () {
      socket.emit("stop", {
        data: "I'm reloaded",
      });
      board.position("start");
      game.reset();
    });
    $(".stop").click(function () {
      $(".board").css("visibility", "hidden");
      $(".play").fadeIn();
      $(".stop").css("visibility", "hidden");
      socket.emit("stop", {
        data: "I'm reseted",
      });
      board.position("start");
      game.reset();
    });
  });
});
