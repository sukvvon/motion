import { AnimationType } from "../../../render/utils/types"
import { MotionProps } from "../../types"
import { Feature } from "../Feature"
import { observeIntersection } from "./observers"

const thresholdNames = {
    some: 0,
    all: 1,
}

export class InViewFeature extends Feature<Element> {
    private hasEnteredView = false

    private isInView = false

    private removeObserver?: Function

    private startObserver() {
        this.removeObserver?.()

        const { viewport = {} } = this.node.getProps()
        const { root, margin: rootMargin, amount = "some", once } = viewport

        const options = {
            root: root?.current,
            rootMargin,
            threshold:
                typeof amount === "number" ? amount : thresholdNames[amount],
        }

        const onIntersectionUpdate = (entry: IntersectionObserverEntry) => {
            const { isIntersecting } = entry

            /**
             * If there's been no change in the viewport state, early return.
             */
            if (this.isInView === isIntersecting) return

            this.isInView = isIntersecting

            /**
             * Handle hasEnteredView. If this is only meant to run once, and
             * element isn't visible, early return. Otherwise set hasEnteredView to true.
             */
            if (once && !isIntersecting && this.hasEnteredView) {
                return
            } else if (isIntersecting) {
                this.hasEnteredView = true
            }

            if (this.node.animationState) {
                this.node.animationState.setActive(
                    AnimationType.InView,
                    isIntersecting
                )
            }

            /**
             * Use the latest committed props rather than the ones in scope
             * when this observer is created
             */
            const { onViewportEnter, onViewportLeave } = this.node.getProps()
            const callback = isIntersecting ? onViewportEnter : onViewportLeave
            callback && callback(entry)
        }

        return observeIntersection(
            this.node.current!,
            options,
            onIntersectionUpdate
        )
    }

    mount() {
        this.startObserver()
    }

    update() {
        const { props, prevProps } = this.node
        const hasOptionsChanged = ["amount", "margin", "root"].some(
            hasViewportOptionChanged(props, prevProps)
        )

        if (hasOptionsChanged) {
            this.startObserver()
        }
    }

    unmount() {
        this.removeObserver?.()
    }
}

function hasViewportOptionChanged(
    { viewport = {} }: MotionProps,
    { viewport: prevViewport = {} }: MotionProps = {}
) {
    return (name: string) => viewport[name] !== prevViewport[name]
}
