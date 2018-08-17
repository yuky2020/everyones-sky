onload = () => {
    onresize(); // trigger initial sizing pass

    C = document.querySelector('canvas');
    C.width = CANVAS_WIDTH;
    C.height = CANVAS_HEIGHT;

    R = C.getContext('2d');

    // Shortcut for all canvas methods to the main canvas
    Object.getOwnPropertyNames(p).forEach(n => {
        if (R[n] && R[n].call) {
            window[n] = p[n].bind(R);
        }
    });

    G = new Game();

    // Start cycle()
    let lf = Date.now();
    let frame = () => {
        let n = Date.now(),
            e = (n - lf) / 1000;

        if(DEBUG){
            G.fps = ~~(1 / e);
        }

        lf = n;

        G.cycle(e);

        requestAnimationFrame(frame);
    };
    frame();
};