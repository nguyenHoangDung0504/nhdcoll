export default class SwipeHandler {
    startX = 0;
    startY = 0;
    endX = 0;
    endY = 0;

    constructor(element, thresholdRatio, leftToRight, rightToLeft) {
        this.element = element;
        this.thresholdRatio = thresholdRatio;
        this.registerEvents();
        this.leftToRight = leftToRight;
        this.rightToLeft = rightToLeft;
    }

    registerEvents() {
        this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.element.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.element.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    handleMouseDown(event) {
        if (event.target.tagName === "IMG") {
            event.preventDefault();
        }
        this.startX = event.clientX;
        this.startY = event.clientY;
    }

    handleMouseUp(event) {
        this.endX = event.clientX;
        this.endY = event.clientY;
        this.handleSwipe();
    }

    handleTouchStart(event) {
        this.startX = event.touches[0].clientX;
        this.startY = event.touches[0].clientY;
    }

    handleTouchEnd(event) {
        this.endX = event.changedTouches[0].clientX;
        this.endY = event.changedTouches[0].clientY;
        this.handleSwipe();
    }

    handleSwipe() {
        const deltaX = this.endX - this.startX;
        const deltaY = this.endY - this.startY;

        if (deltaX > 0 && Math.abs(deltaX / deltaY) > this.thresholdRatio) {
            // console.log('Vuốt ngang từ trái sang phải');
            this.leftToRight();
        } else if (deltaX < 0 && Math.abs(deltaX / deltaY) > this.thresholdRatio) {
            // console.log('Vuốt ngang từ phải sang trái');
            this.rightToLeft();
        }
    }
}