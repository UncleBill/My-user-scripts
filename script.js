//  Hide read items in digg Reader
//
(function(){
    // if (window.__hide_tool_loaded) {
    //     return
    // }
    // window.__hide_tool_loaded = false;
    var body = document.body,
        rclassname = /(?:\W)hide-read-item(?=\W|$)/g,
        storeKey = 'hide_read_item';

    var nav = document.getElementById('reader-nav'),
        firstNavItem = document.querySelector('#reader-nav .nav-item:nth-child(1)'),
        status = localStorage.getItem(storeKey);

    var toggle = function( show ) {
        var cn = body.className;
        if ( show ) {
            body.className = (cn + ' hide-read-item').replace(/\s{2,}/g, ' ').trim();
            localStorage.setItem(storeKey, 1);
        } else {
            body.className = cn.replace(rclassname, ' ').trim();
            localStorage.setItem(storeKey, 0);
        }
    };

    status = parseInt(status);

    var control = document.createElement('input');
    control.type = 'checkbox';
    control.id = "hide-control";
    if ( status ) {
        control.checked = true; 
        toggle( true );
    }
    nav.insertBefore(control, firstNavItem);

    control.addEventListener('click', function () {
        toggle( this.checked )
    });

    // window.__hide_tool_loaded = true;
}());
