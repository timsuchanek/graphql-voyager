import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux'
import * as ReactModal from 'react-modal';
import * as classNames from 'classnames';

import './SchemaModal.css';
import * as buttonDarkTheme from './button-dark.theme.css';
import * as settingsDarkTheme from './settings-dark.theme.css';

import { Button, IconButton } from 'react-toolbox/lib/button';
import CloseIcon from '../icons/close-black.svg';

import * as ClipboardButton from 'react-clipboard.js';

import { introspectionQuery } from 'graphql/utilities';

import {
  changeSchema,
  hideSchemaModal,
  showSchemaModal,
  changeActivePreset,
  changeNaActivePreset,
  changeNaDisplayOptions,
} from '../../actions/';
import { Settings } from './Settings';
import { getNaSchemaSelector } from '../../introspection';

interface SchemaModalProps {
  presets: any;

  showSchemaModal: boolean;
  notApplied: any;
  schema: any;
  dispatch: any;
}

interface SchemaModalState {
  recentlyCopied: boolean;
}

function mapStateToProps(state) {
  return {
    showSchemaModal: state.schemaModal.opened,
    notApplied: state.schemaModal.notApplied,
    schema: getNaSchemaSelector(state),
  };
}

class SchemaModal extends React.Component<SchemaModalProps, SchemaModalState> {
  constructor(props) {
    super(props);
    this.state = {recentlyCopied: false};
  }

  componentDidMount() {
    this.props.dispatch(showSchemaModal())
    if (DEBUG_INITIAL_PRESET) {
      this.props.dispatch(hideSchemaModal())
      this.props.dispatch(changeActivePreset(DEBUG_INITIAL_PRESET));
      this.props.dispatch(changeSchema(this.props.presets[DEBUG_INITIAL_PRESET], {
        transformSchema: function(schema) {
          const {types} = schema
          const copy = Object.assign({}, types)

          Object.keys(copy).forEach(typeName => {
            if (typeName.startsWith('_all') || typeName.startsWith('all')) {
              delete copy[typeName]
            } else {
              const type = copy[typeName]

              if (type.fields) {
                Object.keys(type.fields).forEach(fieldName => {
                  const field = type.fields[fieldName]
                  if (field.type === '_QueryMeta') {
                    delete copy[typeName].fields[fieldName]
                  }
                })
              }
            }
          })

          return Object.assign({}, schema, {
            queryType: 'Node',
            types: copy,
          })
        },
        hideDocs: true,
        hideRoot: true,
      }));
    }
  }

  handleTextChange(event) {
    let text = event.target.value;
    if (text === '')
      text = null;
    this.props.dispatch(changeNaActivePreset('custom', text));
  }

  handlePresetChange(name) {
    this.props.dispatch(changeNaActivePreset(name, this.props.presets[name]));
  }

  handleDisplayOptionsChange(options) {
    this.props.dispatch(changeNaDisplayOptions(options));
  }

  handleChange() {
    const {
      notApplied: {
        activePreset,
        displayOptions,
        presetValue
      }
    } = this.props;

    let schema = activePreset === 'custom' ? JSON.parse(presetValue) : presetValue;
    this.props.dispatch(changeActivePreset(activePreset));
    this.props.dispatch(changeSchema(schema, displayOptions));
    this.props.dispatch(hideSchemaModal())
  }

  close() {
    this.props.dispatch(hideSchemaModal())
  }

  copy() {
    this.setState({...this.state, recentlyCopied: true});
    setTimeout(() => {
      this.setState({...this.state, recentlyCopied: false});
    }, 2000)
  }

  appBar() {
    return (
      <IconButton className="close-icon" onClick={() => this.close()}>
          <CloseIcon color="#ffffff" />
      </IconButton>
    );
  }

  predefinedCards(presetNames:string[], activePreset) {
    return (
      <div className="schema-presets">
        {_(presetNames).without('custom').map(name =>
          <div key={name} className={classNames('introspection-card', {
            '-active': name === activePreset
          })} onClick={() => {
            if (name !== activePreset)
              this.handlePresetChange(name)
          }}>
            <h2> {name} </h2>
          </div>
        ).value()}
      </div>
    );
  }

  customCard(isActive:boolean, customPresetText:string) {
    return (
      <div className="custom-schema-selector">
        <div className={classNames('introspection-card', {
          '-active': isActive
        })} onClick={() => isActive || this.handlePresetChange('custom')}>
          <div className="card-header">
            <h2> Custom Schema </h2>
          </div>
          <div className="card-content">
            <p> Run the introspection query against a GraphQL endpoint. Paste the result into the textarea below to view the model relationships.</p>
            <ClipboardButton component="a" data-clipboard-text={introspectionQuery}
            className={classNames({
              'hint--top': this.state.recentlyCopied
            })}
            data-hint='Copied to clipboard'
            onClick={() => this.copy()}>
              Copy Introspection Query
            </ClipboardButton>
            <textarea value={customPresetText || ''} disabled={!isActive}
            onChange={this.handleTextChange.bind(this)} placeholder="Paste Introspection Here"/>
          </div>
        </div>
      </div>
    );
  }

  modalContent(presetNames, notApplied, schema) {
    if (notApplied === null)
      return null;

    const {
      activePreset,
      displayOptions,
      presetValue,
    } = notApplied;
    const validSelected = !!(schema.schema);
    const errorMessage = schema.error;

    let infoMessage = null;
    let infoClass = null;
    if (errorMessage != null) {
      infoMessage = errorMessage;
      infoClass = '-error';
    }
    else if (activePreset == null) {
      infoMessage = 'Please select introspection';
      infoClass = '-select';
    }
    else if (activePreset === 'custom') {
      infoMessage = 'Please paste your introspection';
      infoClass = '-select';
    }

    return (
      <div className="schema-modal">
        <div className="logo">
          <img src="logo.png" />
        </div>
        <div className="modal-cards">
          {this.predefinedCards(presetNames, activePreset)}
          {this.customCard(activePreset === 'custom', presetValue)}
        </div>
        <div className={classNames('modal-info-panel', {
          '-message': !validSelected,
          '-settings': validSelected
        })}>
          <div className={classNames('modal-message', 'content', infoClass)}>
            {infoMessage}
          </div>
          <Settings theme={settingsDarkTheme}
            schema={schema.schema}
            options={displayOptions}
            onChange={(options) => this.handleDisplayOptionsChange(options)}/>
        </div>
        <Button raised label="Change Schema" theme={buttonDarkTheme}
        disabled={!validSelected} onClick={this.handleChange.bind(this)}/>
      </div>
    );
  }

  render() {
    const {
      showSchemaModal,
      notApplied,
      schema,
      presets
    } = this.props;

    if (!presets) throw new Error('To use schema modal pass "_schemaPresets" property to "<Voyager>"')

    let customStyle = {
      content: {maxHeight: '600px', maxWidth: '1000px'},
      overlay: { zIndex: 10, backgroundColor: 'rgba(0, 0, 0, 0.74902)' }
    };

    return (
      <ReactModal isOpen={showSchemaModal} className="modal-root"
        style={customStyle}
        contentLabel="Select Introspection"
        onRequestClose={() => this.close()}
      >
        {this.appBar()}
        {this.modalContent(Object.keys(presets), notApplied, schema)}
      </ReactModal>
    );
  }
}


export default connect(mapStateToProps)(SchemaModal);
