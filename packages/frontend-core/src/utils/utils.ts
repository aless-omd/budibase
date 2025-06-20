import { makePropSafe as safe } from "@budibase/string-templates"
import { Helpers } from "@budibase/bbui"
import { cloneDeep } from "lodash"
import {
  SearchFilterGroup,
  UISearchFilter,
  UITableResource,
  UIViewResource,
} from "@budibase/types"

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

/**
 * Utility to wrap an async function and ensure all invocations happen
 * sequentially.
 * @param fn the async function to run
 * @return {Function} a sequential version of the function
 */
export const sequential = <
  TReturn,
  TFunction extends (...args: any[]) => Promise<TReturn>,
>(
  fn: TFunction
): TFunction => {
  let queue: (() => Promise<void>)[] = []
  const result = (...params: Parameters<TFunction>) => {
    return new Promise<TReturn>((resolve, reject) => {
      queue.push(async () => {
        let data: TReturn | undefined
        let error: unknown
        try {
          data = await fn(...params)
        } catch (err) {
          error = err
        }
        queue.shift()
        if (queue.length) {
          queue[0]()
        }
        if (error) {
          reject(error)
        } else {
          resolve(data!)
        }
      })
      if (queue.length === 1) {
        queue[0]()
      }
    })
  }
  return result as TFunction
}

/**
 * Utility to debounce an async function and ensure a minimum delay between
 * invocations is enforced.
 * @param callback an async function to run
 * @param minDelay the minimum delay between invocations
 * @returns a debounced version of the callback
 */
export const debounce = <T extends (...args: any[]) => any>(
  callback: T,
  minDelay = 1000
) => {
  let timeout: ReturnType<typeof setTimeout>
  return async (...params: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout)
      }
      timeout = setTimeout(async () => {
        const result = await callback(...params)
        resolve(result)
      }, minDelay)
    })
  }
}

/**
 * Utility to throttle invocations of a synchronous function. This is better
 * than a simple debounce invocation for a number of reasons. Features include:
 * - First invocation is immediate (no initial delay)
 * - Every invocation has the latest params (no stale params)
 * - There will always be a final invocation with the last params (no missing
 *   final update)
 * @param callback
 * @param minDelay
 * @returns {Function} a throttled version function
 */
export const throttle = (callback: Function, minDelay = 1000) => {
  let lastParams: any[]
  let stalled = false
  let pending = false
  const invoke = (...params: any[]) => {
    lastParams = params
    if (stalled) {
      pending = true
      return
    }
    callback(...lastParams)
    stalled = true
    setTimeout(() => {
      stalled = false
      if (pending) {
        pending = false
        invoke(...lastParams)
      }
    }, minDelay)
  }
  return invoke
}

/**
 * Utility to debounce DOM activities using requestAnimationFrame
 * @param callback the function to run
 * @returns {Function}
 */
export const domDebounce = (callback: Function) => {
  let active = false
  let lastParams: any[]
  return (...params: any[]) => {
    lastParams = params
    if (!active) {
      active = true
      requestAnimationFrame(() => {
        callback(...lastParams)
        active = false
      })
    }
  }
}

/**
 * Build the default FormBlock button configs per actionType
 * Parse any legacy button config and mirror its the outcome
 *
 * @param {any} props
 * */
export const buildFormBlockButtonConfig = (props?: {
  _id?: string
  actionType?: string
  dataSource?: UITableResource | UIViewResource
  notificationOverride?: boolean
  actionUrl?: string
  showDeleteButton?: boolean
  deleteButtonLabel?: string
  showSaveButton?: boolean
  saveButtonLabel?: string
}) => {
  const {
    _id,
    actionType,
    dataSource,
    notificationOverride,
    actionUrl,
    showDeleteButton,
    deleteButtonLabel,
    showSaveButton,
    saveButtonLabel,
  } = props || {}

  if (!_id) {
    return
  }
  const formId = `${_id}-form`
  const repeaterId = `${_id}-repeater`
  const resourceId = dataSource?.resourceId

  // Accommodate old config to ensure delete button does not reappear
  const deleteText = showDeleteButton === false ? "" : deleteButtonLabel?.trim()
  const saveText = showSaveButton === false ? "" : saveButtonLabel?.trim()

  const onSave = [
    {
      "##eventHandlerType": "Validate Form",
      parameters: {
        componentId: formId,
      },
    },
    {
      "##eventHandlerType": "Save Row",
      parameters: {
        providerId: formId,
        tableId: resourceId,
        notificationOverride,
        confirm: null,
      },
    },
    {
      "##eventHandlerType": "Close Screen Modal",
    },
    {
      "##eventHandlerType": "Close Side Panel",
    },
    {
      "##eventHandlerType": "Close Modal",
    },
    // Clear a create form once submitted
    ...(actionType !== "Create"
      ? []
      : [
          {
            "##eventHandlerType": "Clear Form",
            parameters: {
              componentId: formId,
            },
          },
        ]),

    ...(actionUrl
      ? [
          {
            "##eventHandlerType": "Navigate To",
            parameters: {
              url: actionUrl,
            },
          },
        ]
      : []),
  ]

  const onDelete = [
    {
      "##eventHandlerType": "Delete Row",
      parameters: {
        confirm: true,
        tableId: resourceId,
        rowId: `{{ ${safe(repeaterId)}.${safe("_id")} }}`,
        revId: `{{ ${safe(repeaterId)}.${safe("_rev")} }}`,
        notificationOverride,
      },
    },
    {
      "##eventHandlerType": "Close Screen Modal",
    },
    {
      "##eventHandlerType": "Close Side Panel",
    },
    {
      "##eventHandlerType": "Close Modal",
    },

    ...(actionUrl
      ? [
          {
            "##eventHandlerType": "Navigate To",
            parameters: {
              url: actionUrl,
            },
          },
        ]
      : []),
  ]

  const defaultButtons = []

  if (
    actionType &&
    ["Update", "Create"].includes(actionType) &&
    showSaveButton !== false
  ) {
    defaultButtons.push({
      text: saveText || "Save",
      _id: Helpers.uuid(),
      _component: "@budibase/standard-components/button",
      onClick: onSave,
      type: "cta",
    })
  }

  if (actionType === "Update" && showDeleteButton !== false) {
    defaultButtons.push({
      text: deleteText || "Delete",
      _id: Helpers.uuid(),
      _component: "@budibase/standard-components/button",
      onClick: onDelete,
      quiet: true,
      type: "warning",
    })
  }

  return defaultButtons
}

export const buildMultiStepFormBlockDefaultProps = (props?: {
  _id: string
  stepCount: number
  currentStep: number
  actionType: string
  dataSource: { resourceId: string }
}) => {
  const { _id, stepCount, currentStep, actionType, dataSource } = props || {}

  // Sanity check
  if (!_id || !stepCount) {
    return
  }

  const title = `Step {{ [${_id}-form].[__currentStep] }}`
  const resourceId = dataSource?.resourceId
  const formId = `${_id}-form`
  let buttons = []

  // Add previous step button if we aren't the first step
  if (currentStep !== 0) {
    buttons.push({
      _id: Helpers.uuid(),
      _component: "@budibase/standard-components/button",
      _instanceName: Helpers.uuid(),
      text: "Back",
      type: "secondary",
      size: "M",
      onClick: [
        {
          parameters: {
            type: "prev",
            componentId: formId,
          },
          "##eventHandlerType": "Change Form Step",
        },
      ],
    })
  }

  // Add a next button if we aren't the last step
  if (currentStep !== stepCount - 1) {
    buttons.push({
      _id: Helpers.uuid(),
      _component: "@budibase/standard-components/button",
      _instanceName: Helpers.uuid(),
      text: "Next",
      type: "cta",
      size: "M",
      onClick: [
        {
          "##eventHandlerType": "Validate Form",
          parameters: {
            componentId: formId,
          },
        },
        {
          parameters: {
            type: "next",
            componentId: formId,
          },
          "##eventHandlerType": "Change Form Step",
        },
      ],
    })
  }

  // Add save button if we are the last step
  if (actionType !== "View" && currentStep === stepCount - 1) {
    buttons.push({
      _id: Helpers.uuid(),
      _component: "@budibase/standard-components/button",
      _instanceName: Helpers.uuid(),
      text: "Save",
      type: "cta",
      size: "M",
      onClick: [
        {
          "##eventHandlerType": "Validate Form",
          parameters: {
            componentId: formId,
          },
        },
        {
          "##eventHandlerType": "Save Row",
          parameters: {
            tableId: resourceId,
            providerId: formId,
          },
        },
        // Clear a create form once submitted
        ...(actionType !== "Create"
          ? []
          : [
              {
                "##eventHandlerType": "Clear Form",
                parameters: {
                  componentId: formId,
                },
              },
            ]),
      ],
    })
  }

  return {
    buttons,
    title,
  }
}

/**
 * Parse out empty or invalid UI filters and clear empty groups
 * @param {Object} filter UI filter
 * @returns {Object} parsed filter
 */
export function parseFilter(filter: UISearchFilter) {
  if (!filter?.groups) {
    return filter
  }

  const update = cloneDeep(filter)

  if (update.groups) {
    update.groups = update.groups
      .map(group => {
        if (group.filters) {
          group.filters = group.filters.filter((filter: any) => {
            return filter.field && filter.operator
          })
          return group.filters?.length ? group : null
        }
        return group
      })
      .filter((group): group is SearchFilterGroup => !!group)
  }

  return update
}
