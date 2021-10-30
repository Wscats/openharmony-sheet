import prompt from '@system.prompt';
import Table from './table/';
import Viewport from './table/viewport.js';

export default {
    props: {
        sheet: {
            type: Array,
            default: []
        },
        canvasWidth: {
            type: String,
            default: '100%',
        },
        cavasHeight: {
            type: String,
            default: '100%',
        },
        tableWidth: {
            type: Number,
            default: 850,
        },
        tableHeight: {
            type: Number,
            default: 800,
        },
    },
    data: {
        isShowArea: false,
        areaTop: 0,
        areaLeft: 0,
        content: '',
        isFocus: true,
    },
    touchstart(evt) {
        this.$emit('clickCellStart', {
            evt,
            el: this.el,
            textarea: this.textarea,
            viewport: this.viewport,
            table: this.table,
        });
        const cell = this.viewport.cell(evt.touches[0].localX, evt.touches[0].localY);
        this.table.$onClick(...cell, evt);
        this.setTextarea(...cell, evt);
    },
    setTableCell() {
        this.table.cell((ri, ci) => {
            return this.sheet?.[ri]?.[ci] || '';
        }).render();
    },
    touchend(evt) {
        this.$emit('clickCellEnd', {
            evt,
            el: this.el,
            textarea: this.textarea,
            viewport: this.viewport,
            table: this.table,
        });
        const range = this.viewport.range(evt.changedTouches[0].localX, evt.changedTouches[0].localY);
        this.table.selection(range);
        this.viewport.render(this.table.$draw);
    },
    longpress(evt) {
        this.$emit('clickCellLongpress');
    },
    change(evt) {
       this.$emit('change', {
           evt,
           el: this.el,
           textarea: this.textarea,
           viewport: this.viewport,
           table: this.table,
       });
        this.content = evt.value;
        this.sheet[this.row][this.col] = this.content;
        this.setTableCell();
    },
    setTextarea(type, cellRect) {
        const textarea = this.textarea;
        const area = this.area;
        this.isShowArea = false;
        switch (type) {
            case 4:
                const { col, height, row, width, x, y } = cellRect;
                let value = this.sheet?.[row]?.[col] || '';
                value = typeof value === 'string' || typeof value === 'number' ?
                    value : value.text
                prompt.showToast({
                    message: `当前值:${value} 位置:第${row + 1}行 第${col + 1}列`,
                    duration: 3000,
                });
                this.areaLeft = x - 2;
                this.areaTop = y - 1;
                this.isShowArea = true;
                this.row = row;
                this.col = col;
                this.content = value;
                break;
        }
    },
    onShow() {
        this.el = this.$refs.canvas;
        this.textarea = this.$refs.textarea;
        this.area = this.$refs.area;

        this.table = Table.create(this.el, this.tableWidth, this.tableHeight);
        this.setTableCell();
        this.viewport = new Viewport(this.table);
        this.$emit('sheetShow', {
            el: this.el,
            textarea: this.textarea,
            viewport: this.viewport,
            table: this.table,
        })
    },
    onHide() {
        this.$emit('sheetHide', {
            el: this.el,
            textarea: this.textarea,
            viewport: this.viewport,
            table: this.table,
        })
    }
}
