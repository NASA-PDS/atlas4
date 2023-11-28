import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import SplitButton from '../SplitButton/SplitButton'

import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward'
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward'

import { setResultSorting } from '../../core/redux/actions/actions.js'

import { makeStyles } from '@material-ui/core/styles'

const useStyles = makeStyles((theme) => ({
    ResultsSorter: {
        height: '26px',
        margin: '7px 5px',
    },
}))

// items is [{ name: 'My Items' }, { ... }]

export default function ResultsSorter(props) {
    const {} = props

    const c = useStyles()
    const dispatch = useDispatch()

    const activeFilters = useSelector((state) => {
        return state.getIn(['activeFilters']).toJS()
    })

    const resultsTable = useSelector((state) => {
        return state.getIn(['resultsTable']).toJS()
    })

    const resultSorting = useSelector((state) => {
        return state.getIn(['resultSorting']).toJS()
    })

    const flatFields = [resultSorting.defaultField]

    const items = [{ name: resultSorting.defaultField }]
    let selectedIndex = null

    //Add all active filters as potential sorts
    Object.keys(activeFilters).forEach((filter) => {
        activeFilters[filter].facets.forEach((f) => {
            if (f.type != 'text') {
                if (resultSorting.field === f.field) selectedIndex = items.length
                items.push({ name: f.field })
                flatFields.push(f.field)
            }
        })
    })

    //Add all table columns as potential sorts
    resultsTable.columns.forEach((field) => {
        if (!flatFields.includes(field)) {
            items.push({ name: field })
            flatFields.push(field)
        }
    })

    if (
        selectedIndex == null &&
        resultSorting.field != null &&
        resultSorting.field != resultSorting.defaultField
    ) {
        items.push({ name: resultSorting.field })
        selectedIndex = items.length - 1
    }

    return (
        <SplitButton
            className={c.ResultsSorter}
            startIcon={
                resultSorting.direction === 'desc' ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />
            }
            truncateDelimiter="."
            items={items}
            forceIndex={selectedIndex}
            onChange={(item, index) => {
                dispatch(setResultSorting(item.name))
            }}
            onClick={() => {
                dispatch(
                    setResultSorting(null, resultSorting.direction === 'desc' ? 'asc' : 'desc')
                )
            }}
        />
    )
}
