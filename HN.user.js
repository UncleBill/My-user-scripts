(function(){
    var NODE_SELECTOR = "tr:nth-child(3n+1) td:nth-child(3n+3)";
    var titles = document.querySelectorAll( NODE_SELECTOR );
    var ll = titles.length;


    var handleScore = function( num ){
        var news = {
            color :"",                  // normal
fontSize :"10pt"
        }
        if( num > 500 ){
            news.color = "#f00";         // superHit
            news.fontSize = "30pt";
        }
        else{
            var c = ~~ ( num % 500 / 500 * 255 );
            c = c.toString( 16 );
            while( c.length < 2 ){
                c = "0" + c;
            }
            var f = ~~ ( num % 500 / 500 * 20 )+10;
            news.color = "#" + c + "0000";
            news.fontSize = f + "pt";
        }

return news;
    }

    var styleTag = document.createElement("style");
    var headTag = document.getElementsByTagName("head")[0];
    styleTag.setAttribute("type","text/css");
    styleTag.textContent=".sizer{-webkit-transition:all 0.2s;}"
        headTag.appendChild( styleTag );

    for( var i = 1;i < ll; ++i ){       // var i = 1; --> ignore the first match
        var _title = titles[i];
        var _scoreNode = _title.parentElement.nextSibling.querySelector('span');
        var _score = _scoreNode && parseInt( _scoreNode.textContent, 10 );
        var thisNews = handleScore( _score );
        var cn = _title.className.replace( "sizer","" ) + " sizer";
        _title.className = cn.replace(/\s{2,}/g," ");
        _title.style.fontSize = thisNews.fontSize;  // fontSize
        _title.querySelector( 'a' ).style.color = thisNews.color;   // color
    }
}());
