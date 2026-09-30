// PrDasboard.styles.ts

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    minHeight: '100vh',
    backgroundColor: '#e8e8e8',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  header: {
    backgroundColor: 'transparent',
    padding: '1.5rem 2.5rem',
    textAlign: 'center'
  },
  headerTitle: {
    fontSize: '1.125rem',
    fontWeight: 500,
    margin: 0,
    color: '#333'
  },
  statusCards: {
    display: 'flex',
    gap: '0.9375rem',
    padding: '1.875rem 2.5rem',
    flexWrap: 'wrap'
  },
  statusCard: {
  backgroundColor: '#3d5566',
  color: 'white',
  padding: '0.5rem 1.5rem',
  borderRadius: '0.375rem',
fontSize: '0.75rem', 
  fontWeight: 500,
  flex: 1,
  minWidth: '8rem',  
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'background-color 0.2s, transform 0.1s',
  display: 'flex', 
  alignItems: 'center',
  justifyContent: 'center' 
},
  statusCardActive: {
    backgroundColor: "#007bff"
  },
 filtersContainer: {
    backgroundColor: 'white',
    margin: '0 2.5rem 1.875rem 2.5rem',
    padding: '1.5625rem 1.875rem',
    borderRadius: '0.375rem',
    boxShadow: '0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.1)'
  },
  filtersHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1rem',
    fontWeight: 500,
    marginBottom: '1.25rem',
    color: '#333'
  },
  filterIcon: {
    width: '1.125rem',
    height: '1.125rem',
    color: '#333'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '1.25rem',
    marginBottom: '1.25rem'
  },
   filtersGrids: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.25rem',
    marginBottom: '1.25rem'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    // gap: '0.5rem'
    flex: 1,
    minWidth: 0
  },
  filterLabel: {
    fontSize: '0.8125rem',
    color: '#333',
    fontWeight: 500
  },
  filterInput: {
    flex: 1,
    padding: '0.625rem 0.75rem',
    border: '0.0625rem solid #ddd',
    borderRadius: '0.25rem',
    fontSize: '0.8125rem',
    color: '#999',
    backgroundColor: 'white',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  },
   select: {
    padding: '0.625rem 0.75rem',
    border: '0.0625rem solid #ddd',
    borderRadius: '0.25rem',
    fontSize: '0.8125rem',
    color: '#999',
    backgroundColor: 'white',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    paddingRight: '2.5rem'
  },

  dateFilters: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '0.75rem'
  },
  filtersActions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-start',
    marginTop: '0.5rem',
    flexWrap: 'wrap',
    width: '100%'
  },
  dateRange: {
    display: 'flex',
    flexDirection:'column',
    gap: '0.625rem',
   
    width: '100%'
  },
  dateInput: {
  width: '100%',              
  padding: '0.625rem 0.75rem',
  border: '0.0625rem solid #ddd',
  borderRadius: '0.25rem',
  fontSize: '0.8125rem',
  color: '#333',
  outline: 'none',
  boxSizing: 'border-box'
}
,
  clearFiltersBtn: {
    padding: '0.625rem 1.5rem',
    backgroundColor: '#e0e0e0',
    border: 'none',
    borderRadius: '0.25rem',
    fontSize: '0.8125rem',
    color: '#333',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'background-color 0.2s'
  },
  tableContainer: {
    margin: '0 2.5rem 1.25rem 2.5rem',
    backgroundColor: 'white',
    borderRadius: '0.375rem',
    overflow: 'hidden',
    boxShadow: '0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.1)'
  },
  paginationTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2.5rem',
    backgroundColor: 'white',
    margin: '0 2.5rem 0 2.5rem',
    borderRadius: '0.375rem 0.375rem 0 0',
    boxShadow: '0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.1)',
    color: '#666',
    fontSize: '0.875rem'
  },
  paginationBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2.5rem',
    backgroundColor: 'white',
    margin: '0 2.5rem 1.25rem 2.5rem',
    borderRadius: '0 0 0.375rem 0.375rem',
    boxShadow: '0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.1)',
    color: '#666',
    fontSize: '0.875rem'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8125rem'
  },
  tableHeaderRow: {
    backgroundColor: '#3d4f5c',
     border: '0.025rem solid #d0d0d0',
     position: 'sticky',
      top: 0,
  zIndex: 2,
  },
  tableHeader: {
    padding: '1rem 0.75rem',
    textAlign: 'left',
    fontWeight: 500,
    fontSize: '0.8125rem',
    whiteSpace: 'nowrap',
    color: 'white',
     border: '0.025rem solid #d0d0d0',
  },
  tableRow: {
    backgroundColor: 'white'
  },
  tableCell: {
    padding: '1rem 0.75rem',
    borderBottom: '0.0625rem solid #e0e0e0',
    color: '#333',
    verticalAlign: 'top'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    backgroundColor: '#f0f0f0',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    color: '#333'
  },
  approversList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    fontSize: '0.75rem',
    lineHeight: 1.4
  },
  sendReminderBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#c94343',
    color: 'white',
    border: 'none',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  expandIcon: {
    fontSize: '1.5rem',
    color: '#4a9eff',
    cursor: 'pointer',
    fontWeight: 'bold',
    userSelect: 'none',
    display: 'inline-block',
    lineHeight: 1
  },
  expandedRow: {
    backgroundColor: '#f9f9f9'
  },
  expandedCell: {
    padding: 0,
    borderBottom: '0.125rem solid #ddd'
  },
  lineItemsContainer: {
    padding: '1.25rem',
    overflowX: 'auto'
  },
 lineItemsTable: {
  width: '100%',
  borderCollapse: 'collapse', // ensures shared borders
  fontSize: '0.8125rem',
   border: '0.025rem solid #d0d0d0',// outer border
   borderSpacing: 0,  
},

lineItemsHeaderRow: {
  backgroundColor: '#4d5f6f',
},

lineItemsHeader: {
  padding: '0.75rem',
  textAlign: 'left',
  fontWeight: 500,
  fontSize: '0.8125rem',
  color: 'white',
 border: '0.025rem solid #d0d0d0',
},

lineItemsRow: {
  transition: 'background-color 0.2s ease',
},

lineItemsCell: {
  padding: '0.75rem',
 border: '0.025rem solid #d0d0d0', 
   color: '#333',
  backgroundColor: '#fafafa',
},
  paginationBtn: {
    padding: '0.5rem 1.25rem',
    backgroundColor: 'white',
    border: '0.0625rem solid #ddd',
    borderRadius: '0.25rem',
    fontSize: '0.875rem',
    color: '#333',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  paginationBtnDisabled: {
    color: '#999',
    cursor: 'not-allowed',
    opacity: 0.5
  },
  paginationInfo: {
    color: '#666'
  },
  modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    },
    modalContent: {
      backgroundColor: '#fff',
      borderRadius: '0.5rem',
      padding: '2rem',
      width: '31.25rem',
      maxWidth: '90%',
      position: 'relative',
      boxShadow: '0 0.25rem 1.25rem rgba(0,0,0,0.15)',
      maxHeight: '90vh',
      overflow: 'visible'
    },
    modalCloseBtn: {
      position: 'absolute',
      top: '1rem',
      right: '1rem',
      background: 'none',
      border: 'none',
      fontSize: '1.75rem',
      cursor: 'pointer',
      color: '#666',
      lineHeight: '1',
      padding: '0',
      width: '2rem',
      height: '2rem'
    },
    modalTitle: {
      fontSize: '1.5rem',
      fontWeight: '600',
      color: '#1a4d9e',
      marginBottom: '0.5rem',
      marginTop: '0'
    },
    modalSubtitle: {
      fontSize: '0.875rem',
      color: '#666',
      marginBottom: '1.25rem',
      marginTop: '0'
    },
    emailInputContainer: {
      position: 'relative',
      marginBottom: '1rem'
    },
    emailInputWrapper: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.375rem',
      padding: '0.5rem',
      fontSize: '0.875rem',
      border: '0.025rem solid #ddd',
      borderRadius: '0.25rem',
      boxSizing: 'border-box',
      minHeight: '2.75rem',
      maxHeight: '7.5rem',
      overflowY: 'auto',
      cursor: 'text',
      alignItems: 'center'
    },
    emailInputWrapperError: {
      borderColor: '#ff4444'
    },
    emailChip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: '0.25rem 0.5rem',
      backgroundColor: '#e3f2fd',
      border: '0.025rem solid #90caf9',
      borderRadius: '0.25rem',
      fontSize: '0.8125rem',
      color: '#1976d2',
      maxWidth: '12.5rem'
    },
    emailChipText: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    removeChipBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '1rem',
      color: '#1976d2',
      padding: '0',
      lineHeight: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    emailInput: {
      flex: 1,
      minWidth: '7.5rem',
      border: 'none',
      outline: 'none',
      fontSize: '0.875rem',
      padding: '0.25rem'
    },
    suggestionsDropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: '#fff',
      border: '0.025rem solid #ddd',
      borderTop: 'none',
      borderRadius: '0 0 0.25rem 0.25rem',
      maxHeight: '11.25rem',
      overflowY: 'auto',
      zIndex: 1001,
      boxShadow: '0 0.25rem 0.375rem rgba(0,0,0,0.1)',
      marginTop: '-0.025rem'
    },
    suggestionItem: {
      padding: '0.625rem 0.75rem',
      cursor: 'pointer',
      borderBottom: '0.025rem solid #f0f0f0',
      fontSize: '0.875rem',
      color: '#333'
    },
    sendReminderModalBtn: {
      width: '60%',
      padding: '0.75rem',
      backgroundColor: '#1a4d9e',
      color: '#fff',
      border: 'none',
      borderRadius: '0.25rem',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '1.25rem',
    },
    errorMessage: {
      color: '#ff4444',
      fontSize: '0.75rem',
      marginTop: '0.25rem'
    },
    containerGrn: {
    position: "relative" as const,
  },
  inputWrapperGrn: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.375rem",        
    padding: "0.5rem",      
    border: "0.025rem solid #ddd",
    borderRadius: "0.25rem", 
    minHeight: "2.75rem",   
    maxHeight: "2.75rem",   
    overflowY: "auto" as const,
    cursor: "text",
    alignItems: "center",
    backgroundColor: "white",
  },
  filtersGridsGrn: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "1.25rem",
    paddingBottom: "1.25rem",
  },
  chipGrn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    padding: "0.25rem 0.5rem", 
    backgroundColor: "#e3f2fd",
    border: "0.025rem solid #90caf9",
    borderRadius: "0.25rem",
    fontSize: "0.8125rem",
    color: "#1976d2",
    maxWidth: "12rem",
  },
  chipTextGrn: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  removeBtnGrn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",      
    color: "#1976d2",
    padding: "0",
    lineHeight: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  inputGrn: {
    flex: 1,
    minWidth: "7.5rem",     
    border: "none",
    outline: "none",
    fontSize: "0.875rem",  
    padding: "0.25rem",    
  },
  suggestionsDropdownGrn: {
    position: "absolute" as const,
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    border: "0.025rem solid #ddd",
    borderTop: "none",
    borderRadius: "0 0 0.25rem 0.25rem", 
    maxHeight: "11.25rem", 
    overflowY: "auto" as const,
    zIndex: 1001,
    boxShadow: "0 0.25rem 0.375rem rgba(0,0,0,0.1)",
    paddingTop: "-0.025rem",
  },
  suggestionItemGrn: {
    padding: "0.625rem 0.75rem", 
    cursor: "pointer",
    borderBottom: "0.025rem solid #f0f0f0",
    fontSize: "0.875rem", 
    color: "#333",
    transition: "background-color 0.2s",
  },
};
export default styles;