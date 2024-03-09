import React, { useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { findCard, moveCard } from '@/helpers/cardSort';

const style = {
    cursor: 'move',
};
const DragWrapper = ({
    canDrag, setEndDrag, iconJSX, selected, compact, badgeContent, badgeColor, tab, tabs, setTabs, _id, children, name,
}) => {
    const ref = useRef(null);
    const [{ handlerId }, drop] = useDrop({
        accept: 'box',
        collect(monitor) {
            return {
                handlerId: monitor.getHandlerId(),
            };
        },
        // canDrop: () => false,
        hover({ _id: draggedId }, monitor) {
            if (!ref.current) {
                return;
            }
            const { index: overIndexActions } = findCard(_id, tabs);
            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset.y - hoverBoundingRect.top;
            moveCard(
                draggedId,
                overIndexActions,
                tabs,
                setTabs,
                hoverClientY,
                hoverMiddleY,
            );
        },
    });

    const [{ isDragging }, drag, preview] = useDrag({
        type: 'box',
        item: {
            _id: tab.name, ...tab, iconJSX, selected, compact, badgeContent, badgeColor,
        },
        canDrag: () => canDrag,
        end: () => setEndDrag(),
        collect: monitor => ({ isDragging: monitor.isDragging() }),
    });

    useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const opacity = isDragging ? 0 : 1;
    drag(drop(ref));

    return <div ref={ref} style={{ ...style, opacity }} data-handler-id={handlerId}>
        <a
            type="box"
            data-handler-id={handlerId}
            onClick={event => event.preventDefault()}
            href={`/#${name}`}
            style={{
                ...style, opacity, color: 'inherit', textDecoration: 'none',
            }}
        >
            {children}
        </a>
    </div>;
};

export default DragWrapper;
